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
const batchSize:number = 5;
let targetCollection = db.collection(collectionName);
let cursor: string = '';

function getDocumentsPage(collection:any, cursor:any) {
  // console.log('getting page');
  if (cursor) {
    return Rx.Observable.fromPromise(
      collection
      .orderBy(admin.firestore.FieldPath.documentId())
      .limit(batchSize)
      .startAt(cursor)
      .get()
      );
  } else {
    return Rx.Observable.fromPromise(
      collection
      .orderBy(admin.firestore.FieldPath.documentId())
      .limit(batchSize)
      .get()
      )
  }
}

// https://gist.github.com/amowu/5566485c9a8a64f3de171528f086fb24
// Based on: https://stackoverflow.com/questions/35254323/rxjs-observable-pagination
function fetchCollection(collection:any, cursor?:any) {
  return Rx.Observable.defer(
    () => getDocumentsPage(collection, cursor)
      .flatMap((snapshot:any) => {

        console.log(snapshot.docs.length);
        const items$ = Rx.Observable.from(snapshot.docs);
        let next$;
        if (snapshot.docs.length < batchSize) {
          next$ = Rx.Observable.empty();
        } else {
          cursor = snapshot.docs[snapshot.docs.length - 1].id;
          // I'm stuck here - how do I set next$ to an observable
          // of this promise-based observable's results
          next$ = Rx.Observable.from(
            getDocumentsPage(collection, cursor)
              .flatMap((snapshot:any) => {
                return snapshot.docs;
              }));
        }
        // console.log('next');
        // console.log(next$);
        return Rx.Observable.concat(
          items$,
          next$
        );
      })
  );
}

let documents$ = fetchCollection(targetCollection);

documents$.take(30).subscribe((d:any) => {
  console.log('doc');
  // console.log(d);
});
