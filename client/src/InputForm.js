import React, { useState } from 'react';

const InputForm = ({ onSubmit, isLoading }) => {
  const [groupId, setGroupId] = useState('');
  const [contestId, setContestId] = useState('');
  const [blackList, setBlackList] = useState('');
  const [
    matchingPercentageThreshold,
    setMatchingPercentageThreshold,
  ] = useState('');

  const submitHandler = event => {
    event.preventDefault();
    onSubmit({ groupId, contestId, blackList, matchingPercentageThreshold: +matchingPercentageThreshold });
  };

  const createOnChangeHandler = setter => event => {
    setter(event.target.value);
  };

  return (
    <form onSubmit={submitHandler}>
      <div className="form-group">
        <label htmlFor="groupId">Group ID</label>
        <input
          className="form-control"
          id="groupId"
          placeholder="Enter Group ID"
          value={groupId}
          onChange={createOnChangeHandler(setGroupId)}
        />
      </div>
      <div className="form-group">
        <label htmlFor="contestId">Contest ID</label>
        <input
          className="form-control"
          id="contestId"
          placeholder="Enter Contest ID"
          value={contestId}
          onChange={createOnChangeHandler(setContestId)}
        />
      </div>
       <div className="form-group">
        <label htmlFor="blackList">Blacklist Problems</label>
        <input
          className="form-control"
          id="blackList"
          placeholder="Enter Problems To Filter A,B,C"
          value={blackList}
          onChange={createOnChangeHandler(setBlackList)}
        />
      </div>
      <div className="form-group">
        <label htmlFor="matchingPercentageThreshold">
          Matching Percentage Threshold
        </label>
        <input
          className="form-control"
          id="matchingPercentageThreshold"
          placeholder="Enter Matching Percentage Threshold"
          value={matchingPercentageThreshold}
          onChange={createOnChangeHandler(setMatchingPercentageThreshold)}
        />
      </div>
      <button type="submit" className="btn btn-primary" disabled={isLoading}>
        {isLoading && (
          <div class="spinner-border spinner-grow-sm mr-1" role="status">
            <span class="sr-only">Loading...</span>
          </div>
        )}
        Submit
      </button>
    </form>
  );
};

export default InputForm;
