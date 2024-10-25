'use client';

import { useState, useEffect } from 'react';
import { PlusCircle, FileText, AlertCircle, Upload, Trash2 } from 'lucide-react';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, getDocs, deleteDoc, doc } from 'firebase/firestore';
import { getStorage, ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';

// Firebase configuration
const firebaseConfig = {
  apiKey: "AIzaSyCrg-NHzVc0SqwxcdUVZ4eAZRLVRM9Xboo",
  authDomain: "car-document-manager.firebaseapp.com",
  projectId: "car-document-manager",
  storageBucket: "car-document-manager.appspot.com",
  messagingSenderId: "597222673116",
  appId: "1:597222673116:web:6478024feb1acb13a84219"
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app);
const storage = getStorage(app);

export default function CarDocs() {
  const [documents, setDocuments] = useState([]);
  const [newDoc, setNewDoc] = useState({ title: '', date: '', type: 'other' });
  const [uploadedDocs, setUploadedDocs] = useState([]);

  // Fetch documents on initial render
  useEffect(() => {
    fetchDocuments();
    fetchUploadedDocuments();
  }, []);

  // Fetch documents from Firestore
  const fetchDocuments = async () => {
    const querySnapshot = await getDocs(collection(db, "documents"));
    const docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setDocuments(docs);
  };

  // Fetch uploaded documents from Firestore
  const fetchUploadedDocuments = async () => {
    const querySnapshot = await getDocs(collection(db, "uploadedDocuments"));
    const docs = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setUploadedDocs(docs);
  };

  // Add a new document to Firestore
  const addDocument = async (e) => {
    e.preventDefault();
    if (newDoc.title && newDoc.date && newDoc.type) {
      await addDoc(collection(db, "documents"), newDoc);
      setNewDoc({ title: '', date: '', type: 'other' });
      fetchDocuments(); // Refresh documents list after adding
    }
  };

  // Calculate remaining days for expiration
  const getRemainingDays = (date) => {
    const expirationDate = new Date(date);
    const today = new Date();
    const differenceInDays = Math.ceil((expirationDate - today) / (1000 * 3600 * 24));
    return differenceInDays;
  };

  const isDocumentExpiringSoon = (date) => {
    const remainingDays = getRemainingDays(date);
    return remainingDays <= 30 && remainingDays > 0;
  };

  const isDocumentExpired = (date) => {
    return getRemainingDays(date) < 0;
  };

  // Upload files to Firebase Storage and save metadata in Firestore
  const handleFileUpload = async (e, type) => {
    const file = e.target.files?.[0];
    if (file) {
      const storageRef = ref(storage, `documents/${type}/${file.name}`);
      await uploadBytes(storageRef, file);
      const url = await getDownloadURL(storageRef);
      const docRef = await addDoc(collection(db, "uploadedDocuments"), { name: file.name, type, url });
      setUploadedDocs([...uploadedDocs, { id: docRef.id, name: file.name, type, url }]);
    }
  };

  // Remove uploaded document from Firestore and Firebase Storage
  const removeUploadedDoc = async (id, name, type) => {
    await deleteDoc(doc(db, "uploadedDocuments", id));
    const storageRef = ref(storage, `documents/${type}/${name}`);
    await deleteObject(storageRef);
    setUploadedDocs(uploadedDocs.filter(doc => doc.id !== id));
  };

  return (
    <div className="min-h-screen bg-gray-100 py-6 flex flex-col justify-center sm:py-12">
      <div className="relative py-3 sm:max-w-xl sm:mx-auto">
        <div className="absolute inset-0 bg-gradient-to-r from-cyan-400 to-light-blue-500 shadow-lg transform -skew-y-6 sm:skew-y-0 sm:-rotate-6 sm:rounded-3xl"></div>
        <div className="relative px-4 py-10 bg-white shadow-lg sm:rounded-3xl sm:p-20">
          <div className="max-w-md mx-auto">
            <h1 className="text-2xl font-semibold mb-6">CarDocs Manager</h1>

            {/* Upload Section */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Document Locker</h2>
              <div className="space-y-4">
                {['driving_license', 'rc', 'pollution_certificate'].map((type) => (
                  <div key={type}>
                    <label htmlFor={type} className="block text-sm font-medium text-gray-700 mb-2 capitalize">
                      {type.replace('_', ' ')}
                    </label>
                    <div className="flex items-center space-x-2">
                      <input
                        type="file"
                        id={type}
                        className="hidden"
                        onChange={(e) => handleFileUpload(e, type)}
                      />
                      <label
                        htmlFor={type}
                        className="px-4 py-2 bg-cyan-500 text-white rounded-md hover:bg-cyan-600 cursor-pointer"
                      >
                        <Upload className="w-5 h-5 inline-block mr-2" />
                        Upload
                      </label>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Display Documents */}
            <div className="mb-8">
              <h2 className="text-xl font-semibold mb-4">Uploaded Documents</h2>
              <ul className="space-y-2">
                {uploadedDocs.map((doc) => (
                  <li key={doc.id} className="flex items-center justify-between">
                    <a href={doc.url} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">
                      {doc.name}
                    </a>
                    <button
                      onClick={() => removeUploadedDoc(doc.id, doc.name, doc.type)}
                      className="text-red-500 hover:text-red-700"
                    >
                      <Trash2 className="w-5 h-5" />
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Form to Add New Document */}
            <form onSubmit={addDocument} className="space-y-4">
              <input
                type="text"
                placeholder="Document Title"
                value={newDoc.title}
                onChange={(e) => setNewDoc({ ...newDoc, title: e.target.value })}
                className="w-full px-4 py-2 border rounded-md"
                required
              />
              <input
                type="date"
                value={newDoc.date}
                onChange={(e) => setNewDoc({ ...newDoc, date: e.target.value })}
                className="w-full px-4 py-2 border rounded-md"
                required
              />
              <select
                value={newDoc.type}
                onChange={(e) => setNewDoc({ ...newDoc, type: e.target.value })}
                className="w-full px-4 py-2 border rounded-md"
                required
              >
                <option value="pollution">Pollution Renewal</option>
                <option value="insurance">Insurance Renewal</option>
                <option value="other">Other</option>
              </select>
              <button type="submit" className="w-full bg-cyan-500 text-white px-4 py-2 rounded-md hover:bg-cyan-600">
                <PlusCircle className="w-5 h-5 inline-block mr-2" />
                Add Document
              </button>
            </form>

            {/* Document List with Expiration Status */}
            <ul className="mt-8 space-y-4">
              {documents.map((doc) => (
                <li key={doc.id} className="flex items-center space-x-4">
                  <FileText className="w-5 h-5 text-cyan-500" />
                  <span className="flex-grow">{doc.title}</span>
                  <span className="text-sm text-gray-600">
                    {isDocumentExpired(doc.date)
                      ? <AlertCircle className="w-5 h-5 text-red-500" />
                      : isDocumentExpiringSoon(doc.date)
                      ? `${getRemainingDays(doc.date)} days left`
                      : 'Valid'}
                  </span>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </div>
    </div>
  );
}
