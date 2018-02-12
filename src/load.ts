import { fromCSV } from 'rx-from-csv';
const Rx = require('rxjs/Rx');

import 'rxjs/add/operator/bufferCount';
import 'rxjs/add/operator/mergeMap';
import 'rxjs/observable/fromPromise';

const uuidv4 = require('uuid/v4');
const admin = require('firebase-admin');

const collectionName:string = "csvtest";
// note on crappy airport wifi, these numbers hit 
// 2300 writes-per-second, so it would not be hard
// to hit the beta limit of 2500 WPS
const concurrentRequests:number = 10;
const batchSize:number = 250;

// firebase --project wheelchair-demo firestore:delete -y --shallow /csvtest

admin.initializeApp({
  credential: admin.credential.applicationDefault()
});

let db = admin.firestore();

let collection = db.collection(collectionName);

function writeBatch(bundle:any[]) {
  console.log("building batch");
  let batch = db.batch();
  for (let i of bundle) {
    // note there is no .add method on batch
    batch.set(collection.doc(uuidv4()), i);
  }
  return Rx.Observable.fromPromise(batch.commit());
}

fromCSV('../data.csv')
  .bufferCount(batchSize)
  .mergeMap(bundle => writeBatch(bundle),
    // (oVal, iVal, oIndex, iIndex) => [oIndex, oVal, iIndex, iVal],
    () => '',
    concurrentRequests)
  .subscribe(result => console.log("batch written"));
