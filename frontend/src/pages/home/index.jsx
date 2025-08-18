import React from "react";
import { Link } from "react-router-dom";

export default function HomePage() {
  return (
    <div className="min-h-screen bg-gray-100 p-8 flex flex-col items-center">
      <div className="container max-w-4xl mx-auto">
        <header className="text-center mb-12">
          <h1 className="text-5xl font-extrabold text-gray-900 leading-tight">
            Selamat Datang di <span className="text-blue-600">Olist Dashboard</span>
          </h1>
          <p className="mt-4 text-xl text-gray-600">Sistem Analitik E-commerce Brasil yang komprehensif</p>
        </header>

        <main className="bg-white p-8 rounded-lg shadow-xl border border-gray-200">
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Tentang Proyek</h2>
          <p className="text-gray-700 leading-relaxed">Proyek ini adalah sistem analitik <em>end-to-end</em> untuk dataset publik Olist.</p>
          <ul className="list-disc list-inside mt-4 ml-2 text-gray-600 space-y-1">
            <li><strong>ETL</strong> Airflow/Spark</li>
            <li><strong>Database</strong> PostgreSQL</li>
            <li><strong>REST API</strong> Express (JWT cookie)</li>
            <li><strong>Frontend</strong> React + AntD + Tailwind</li>
          </ul>
        </main>

        <div className="mt-12 text-center flex justify-center gap-4">
          <Link to="/dashboard" className="inline-block bg-blue-600 hover:bg-blue-700 text-white font-bold py-3 px-8 rounded-full shadow-lg">Dashboard</Link>
          {/* <Link to="/register" className="inline-block bg-green-600 hover:bg-green-700 text-white font-bold py-3 px-8 rounded-full shadow-lg">Register</Link> */}
        </div>
      </div>
    </div>
  );
}
