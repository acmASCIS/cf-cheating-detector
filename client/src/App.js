import React, { useState } from 'react';
import axios from 'axios';
import InputForm from './InputForm';
import CheatersTable from './CheatersTable';

function App() {
  const [cheaters, setCheaters] = useState(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const onSubmit = async data => {
    const url = `${process.env.REACT_APP_API_URL ||
      'http://localhost:3000'}/api/cheating-detection`;
    setIsLoading(true);
    try {
      const result = await axios.post(url, data, {
        timeout: 0,
      });
      setCheaters(result.data.sort((a, b) => b.matchingPercentage - a.matchingPercentage));
    } catch (error) {
      alert('An error occurred. \n' + error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container-fluid">
      <h1>Codeforces Cheating Detector</h1>
      {cheaters === undefined ? (
        <InputForm onSubmit={onSubmit} isLoading={isLoading} />
      ) : (
        <CheatersTable cheatingCases={cheaters} />
      )}
    </div>
  );
}

export default App;
