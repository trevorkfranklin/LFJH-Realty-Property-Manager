import { createContext, useContext, useState } from 'react';

const PropertyFilterContext = createContext({ filterProperty: '', setFilterProperty: () => {} });

export function PropertyFilterProvider({ children }) {
  const [filterProperty, setFilterProperty] = useState('');
  return (
    <PropertyFilterContext.Provider value={{ filterProperty, setFilterProperty }}>
      {children}
    </PropertyFilterContext.Provider>
  );
}

export const usePropertyFilter = () => useContext(PropertyFilterContext);
