import Cheating_Detector from './cheating-detector';

const cheatingDetector = new Cheating_Detector('Rojer','As102030-=','ZR9JZ5TsFc','217033');

const res = cheatingDetector.getSourceCode('64417726');

console.log(res);