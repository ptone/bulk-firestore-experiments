const admin = require('firebase-admin');

const Rx = require('rxjs/Rx');
import 'rxjs/add/observable/range';
import 'rxjs/add/operator/mergeMap';
import 'rxjs/add/operator/takeUntil';
import 'rxjs/observable/fromPromise';

import { BehaviorSubject } from 'rxjs/BehaviorSubject';
import { Subject } from 'rxjs/Subject';

admin.initializeApp({
  credential: admin.credential.applicationDefault()
});

var db = admin.firestore();

const collectionName:string = "csvtest";
const concurrentRequests:number = 10;
const batchSize:number = 250;
let collection = db.collection(collectionName);

let break$ = new Subject<boolean>();

let endGet: boolean = false;
let headers: string[] = [];

function getChunk(offset: number) {
  if (endGet) {return []};
  console.error("documents from", offset)
  return Rx.Observable.fromPromise(
    collection.limit(batchSize).offset(offset).get()
  )
}

//break$.asObservable().subscribe(f => console.log("empty: ", f));

// there has to be a better way to do an "inifite range"
let chunks = Rx.Observable.range(0, 200);

chunks
  .map((r:number) => r * batchSize)
  .mergeMap((offset: number) => getChunk(offset),
    (oVal:any, snapshot:any, oIndex:any, iIndex:any) => snapshot,
    concurrentRequests)
  .subscribe((snapshot:any) => {
    if (!snapshot.empty) {
      snapshot.forEach((doc: any) => {
        let row = doc.data();
        if (headers.length == 0) {
          headers = Object.keys(row).sort();
          console.log(headers.join(','));
        }
        let dataArray = [];
        for (let k of headers) {
          dataArray.push(row[k]);
        }
        console.log(dataArray.join(','));
      });
    } else {
      // there were no more records
      //console.log("end");
      break$.next(snapshot.empty)
      endGet = true;
    }
  });
