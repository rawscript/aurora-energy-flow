import React from 'react';

const TestEnv = () => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || (typeof process !== 'undefined' && process.env.VITE_SUPABASE_URL) || '';
  const supabaseKey = import.meta.env.VITE_SUPABASE_PUBLIC_KEY || (typeof process !== 'undefined' && process.env.VITE_SUPABASE_PUBLIC_KEY) || '';
  
  return (
    <div className="p-4 bg-slate-800 text-white">
      <h1 className="text-2xl font-bold mb-4">Environment Variables Test</h1>
      <div className="space-y-2">
        <p><strong>VITE_SUPABASE_URL:</strong> {supabaseUrl || 'Not found'}</p>
        <p><strong>VITE_SUPABASE_PUBLIC_KEY:</strong> {supabaseKey || 'Not found'}</p>
        <p><strong>Both present:</strong> {(supabaseUrl && supabaseKey) ? 'Yes' : 'No'}</p>
      </div>
    </div>
  );
};

export default TestEnv;