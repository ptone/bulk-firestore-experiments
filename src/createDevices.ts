import { fromCSV } from 'rx-from-csv';
const Rx = require('rxjs/Rx');
const fs = require('fs');

import 'rxjs/add/operator/bufferCount';
import 'rxjs/add/operator/mergeMap';
import 'rxjs/add/operator/map';
import 'rxjs/observable/fromPromise';
import { WSAEAFNOSUPPORT } from 'constants';

const uuidv4 = require('uuid/v4');
var {google} = require('googleapis');

const cloudRegion: string = "us-central1";
const registryId: string = "t-registry";
const projectId: string = "iot-provisioning";
const parentName = `projects/${projectId}/locations/${cloudRegion}`;
const registryName = `${parentName}/registries/${registryId}`;

const concurrentRequests:number = 25;

async function getADC() {
  const res = await google.auth.getApplicationDefault();
  let client = res.credential;
  if (client.createScopedRequired && client.createScopedRequired()) {
    // Scopes can be specified either as an array or as a single, space-delimited string.
    const scopes = ['https://www.googleapis.com/auth/cloud-platform'];
    client = client.createScoped(scopes);
  }
  return {
    client: client,
    projectId: res.projectId
  }
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
  const adc = await getADC();
  let client = google.cloudiot({
    version: 'v1',
    auth: adc.client
  })

  fromCSV('../devices.csv')
  .map(r => r)
  .mergeMap(row => createUnauthDevice(client, row),
    // (oVal, iVal, oIndex, iIndex) => [oIndex, oVal, iIndex, iVal],
    () => '',
    concurrentRequests)
  .subscribe(result => console.log(result));
}

main();