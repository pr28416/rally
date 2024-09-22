import React, { createContext, useContext, useState, useEffect } from 'react';

type ScriptContextType = {
  script: string | null;
  setScript: (script: string) => void;
};

const ScriptContext = createContext<ScriptContextType | undefined>(undefined);

export const ScriptProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [script, setScriptState] = useState<string | null>(null);

  useEffect(() => {
    const storedScript = localStorage.getItem('script');
    if (storedScript) {
      setScriptState(storedScript);
    }
  }, []);

  const setScript = (newScript: string) => {
    setScriptState(newScript);
    localStorage.setItem('script', newScript);
  };

  return (
    <ScriptContext.Provider value={{ script, setScript }}>
      {children}
    </ScriptContext.Provider>
  );
};

export const useScript = () => {
  const context = useContext(ScriptContext);
  if (context === undefined) {
    throw new Error('useScript must be used within a ScriptProvider');
  }
  return context;
};