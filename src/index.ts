import { fromCSV } from 'rx-from-csv';
import 'rxjs/add/operator/bufferCount';

const uuidv4 = require('uuid/v4');
const admin = require('firebase-admin');

// var serviceAccount = require("path/to/serviceAccountKey.json");

admin.initializeApp({
  // credential: admin.credential.cert(serviceAccount)
  credential: admin.credential.applicationDefault()
});

var db = admin.firestore();

var dataRef = db.collection('csvtest');


/**
 * For example, there is a data.csv with content
 *
 * id,name
 * 1,"Mike",
 * 2,"Tommy"
 */

fromCSV('../data.csv')
  .bufferCount(3)
  .subscribe((bundle) => {
    console.log("building batch");
    let batch = db.batch();
    for (let i in bundle) {
      console.log(i); // "0", "1", "2",
      batch.set(dataRef.doc(uuidv4()), bundle[i]);
      // batch.add(i);
   }
   batch.commit().then(() => console.log("batch written"));
  });
