import React, { createContext, useContext, useState, useEffect } from 'react';

export type Theme = 'dark' | 'light';
export type TemplateId = 'cyber-dark' | 'clean-light';

interface ThemeContextType {
  theme: Theme;
  template: TemplateId;
  toggleTheme: () => void;
  setTheme: (theme: Theme) => void;
  setTemplate: (template: TemplateId) => void;
  toggleTemplate: () => void;
}

const ThemeContext = createContext<ThemeContextType | undefined>(undefined);

export const ThemeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [template, setTemplateState] = useState<TemplateId>(() => {
    const saved = localStorage.getItem('cnip_template') as TemplateId;
    return saved === 'clean-light' ? 'clean-light' : 'cyber-dark';
  });

  const theme: Theme = template === 'clean-light' ? 'light' : 'dark';

  useEffect(() => {
    const root = document.documentElement;

    // Set template data attribute and theme classes
    root.setAttribute('data-template', template);

    if (theme === 'dark') {
      root.classList.add('dark');
      root.classList.remove('light');
    } else {
      root.classList.add('light');
      root.classList.remove('dark');
    }

    localStorage.setItem('cnip_template', template);
    localStorage.setItem('cnip_theme', theme);
  }, [template, theme]);

  const toggleTheme = () => {
    setTemplateState((prev) => (prev === 'cyber-dark' ? 'clean-light' : 'cyber-dark'));
  };

  const toggleTemplate = () => {
    setTemplateState((prev) => (prev === 'cyber-dark' ? 'clean-light' : 'cyber-dark'));
  };

  const setTheme = (newTheme: Theme) => {
    setTemplateState(newTheme === 'dark' ? 'cyber-dark' : 'clean-light');
  };

  const setTemplate = (newTemplate: TemplateId) => {
    setTemplateState(newTemplate);
  };

  return (
    <ThemeContext.Provider
      value={{
        theme,
        template,
        toggleTheme,
        setTheme,
        setTemplate,
        toggleTemplate,
      }}
    >
      {children}
    </ThemeContext.Provider>
  );
};

export const useTheme = (): ThemeContextType => {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error('useTheme must be used within a ThemeProvider');
  }
  return context;
};
