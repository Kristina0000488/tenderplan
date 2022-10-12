import React, { useState } from 'react';

import ChipsInput          from './components/ChipsInput';

import './App.css';


function App() 
{
  const [ value, setValue ] = useState<string>('');

  return (
    <div className="App">
      <ChipsInput 
        value={ value } 
        onChange={ ( newValue: string ) => setValue(newValue) } 
      />
    </div>
  );
}

export default App;
