import React from 'react';

const CheatersTable = ({ cheatingCases }) => (
  <table class="table">
    <thead>
      <tr>
        <th scope="col">#</th>
        <th scope="col">Problem</th>
        <th scope="col">First Handle</th>
        <th scope="col">Second Handle</th>
        <th scope="col">Matching Percentage</th>
        <th scope="col">First Submission</th>
        <th scope="col">Second Submission</th>
      </tr>
    </thead>
    <tbody>
      {cheatingCases.map((cheatingCase, index) => (
        <tr>
          <th scope="row">{index + 1}</th>
          <td>{cheatingCase.first.index}</td>
          <td>{cheatingCase.first.handle}</td>
          <td>{cheatingCase.second.handle}</td>
          <td>{cheatingCase.matchingPercentage}</td>
          <td><a href={cheatingCase.first.url}>Code</a></td>
          <td><a href={cheatingCase.second.url}>Code</a></td>
        </tr>
      ))}
    </tbody>
  </table>
);

export default CheatersTable;
