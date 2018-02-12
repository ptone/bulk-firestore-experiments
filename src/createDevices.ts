import { fromCSV } from 'rx-from-csv';
const Rx = require('rxjs/Rx');
const fs = require('fs');

import 'rxjs/add/operator/bufferCount';
import 'rxjs/add/operator/mergeMap';
import 'rxjs/add/operator/map';
import 'rxjs/observable/fromPromise';
import { WSAEAFNOSUPPORT } from 'constants';

const uuidv4 = require('uuid/v4');

//const google = require('googleapis');
const google = require("googleapis-async");

const API_VERSION = 'v1';
const DISCOVERY_API = 'https://cloudiot.googleapis.com/$discovery/rest';

const concurrentRequests:number = 25;

async function makeClient() {
  const googleAuth = process.env.GOOGLE_APPLICATION_CREDENTIALS;
  const serviceAccount = JSON.parse(fs.readFileSync(googleAuth));
  const jwtAccess = new google.auth.JWT();
  jwtAccess.fromJSON(serviceAccount);
  jwtAccess.scopes = 'https://www.googleapis.com/auth/cloud-platform';
  google.options({ auth: jwtAccess });
  const discoveryUrl = `${DISCOVERY_API}?version=${API_VERSION}`;
  let client = new Promise(function(resolve,reject){
    google.discoverAPI(discoveryUrl, function(err:any, client:any){
           if(err !== null) return reject(err);
           resolve(client);
       });
  });
  let c = await client;
  return c;
}


function createUnauthDevice(client:any, row:any)
  {
  // [START iot_create_unauth_device]
  // Client retrieved in callback
  // getClient(serviceAccountJson, function(client) {...});
  // const cloudRegion = 'us-central1';
  // const deviceId = 'my-unauth-device';
  // const projectId = 'adjective-noun-123';
  // const registryId = 'my-registry';
  // let deviceId: string = row['deviceId'] ? row['deviceId'] : uuidv4();
  let deviceId = 'd-' + uuidv4();
  let cloudRegion: string = "us-central1";
  let registryId: string = "t-registry";
  let projectId: string = "iot-provisioning";
  const body = {
    id: deviceId,
    // credentials: [
    //   {
    //     publicKey: {
    //       format: 'ES256_PEM',
    //       key: fs.readFileSync(esCertificateFile).toString()
    //     }
    //   }
    // ]
  };
  console.log('Creating device:', deviceId);
  const parentName = `projects/${projectId}/locations/${cloudRegion}`;
  const registryName = `${parentName}/registries/${registryId}`;

  const request = {
    parent: registryName,
    resource: { id: deviceId }
  };

  return Rx.Observable.create((observer:any) => {
    client.projects.locations.registries.devices.create(request, (err:any, data:any) => {
      if (err) {
        console.log('Could not create device');
        console.log(err);
        // TODO not really sure this should be passed in observable as data or observer.error
        observer.next(err);
        observer.complete();
      } else {
        console.log('Created device');
        //console.log(data);
        observer.next(data);
        observer.complete();
      }
    });
  })

// [END iot_create_unauth_device]
}

async function main() {
  console.log('hello');
  let client = await makeClient();
  // console.log(client);
  console.log('there');

  fromCSV('../devices.csv')
  .map(r => r)
  .mergeMap(row => createUnauthDevice(client, row),
    // (oVal, iVal, oIndex, iIndex) => [oIndex, oVal, iIndex, iVal],
    () => '',
    concurrentRequests)
  .subscribe(result => console.log(result));
}

main();