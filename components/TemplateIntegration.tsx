import React from 'react';
import { Code, UploadCloud, FileJson, ArrowRight } from 'lucide-react';

export const TemplateIntegration: React.FC = () => {
  return (
    <div className="flex flex-col items-center justify-center h-[calc(100vh-8rem)] p-6">
      <div className="max-w-2xl w-full bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden">
        <div className="bg-slate-900 p-8 text-center">
          <div className="w-16 h-16 bg-blue-600 rounded-xl mx-auto flex items-center justify-center mb-4 shadow-lg shadow-blue-900/50">
            <Code className="text-white w-8 h-8" />
          </div>
          <h2 className="text-2xl font-bold text-white mb-2">Architectural Blueprint Ready</h2>
          <p className="text-slate-400">Waiting for external HTML templates for semantic analysis and integration.</p>
        </div>
        
        <div className="p-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
            <div className="text-center p-4 rounded-xl bg-slate-50 border border-slate-100">
              <div className="w-10 h-10 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-3 text-blue-600">
                <FileJson size={20} />
              </div>
              <h3 className="font-semibold text-slate-900 text-sm">Step 1</h3>
              <p className="text-xs text-slate-500 mt-1">Review your HTML structure</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-slate-50 border border-slate-100 relative">
              <div className="absolute top-1/2 -left-3 transform -translate-y-1/2 text-slate-300 hidden md:block">
                <ArrowRight size={16} />
              </div>
              <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center mx-auto mb-3 text-purple-600">
                <Code size={20} />
              </div>
              <h3 className="font-semibold text-slate-900 text-sm">Step 2</h3>
              <p className="text-xs text-slate-500 mt-1">Componentize & Refactor</p>
            </div>
            <div className="text-center p-4 rounded-xl bg-slate-50 border border-slate-100 relative">
              <div className="absolute top-1/2 -left-3 transform -translate-y-1/2 text-slate-300 hidden md:block">
                <ArrowRight size={16} />
              </div>
              <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-3 text-green-600">
                <UploadCloud size={20} />
              </div>
              <h3 className="font-semibold text-slate-900 text-sm">Step 3</h3>
              <p className="text-xs text-slate-500 mt-1">Deploy Modules</p>
            </div>
          </div>

          <div className="bg-blue-50 border border-blue-100 rounded-lg p-4 mb-6">
            <h4 className="font-semibold text-blue-800 mb-2 flex items-center text-sm">
              <span className="w-2 h-2 bg-blue-500 rounded-full mr-2"></span>
              Architect's Instructions
            </h4>
            <p className="text-sm text-blue-700 leading-relaxed">
              I have established the core Redux-like state flow and Layout logic. 
              Please provide the HTML code for the specific modules (Products, Inventory, Orders) so I can map them to the <code>src/components</code> directory and establish the correct data interfaces.
            </p>
          </div>
          
          <button className="w-full bg-slate-900 hover:bg-slate-800 text-white font-medium py-3 rounded-lg transition-colors flex items-center justify-center">
            Upload / Paste HTML Source
            <ArrowRight className="ml-2 w-4 h-4" />
          </button>
        </div>
      </div>
    </div>
  );
};