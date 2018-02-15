//const google = require('googleapis');
const google = require("googleapis-async");
const Rx = require('rxjs/Rx');


const API_VERSION = 'v1';
const DISCOVERY_API = 'https://cloudiot.googleapis.com/$discovery/rest';

const concurrentRequests:number = 25;

import { makeClient } from './createDevices';

function listDevices(client:any, pageToken?:string) {
  let cloudRegion: string = "us-central1";
  let registryId: string = "t-registry";
  let projectId: string = "iot-provisioning";
  const body:any = {
    fieldMask: '',
    pageSize: 250,
  };
  if (pageToken) {
    body['pageToken'] = pageToken;
  }
  const parentName = `projects/${projectId}/locations/${cloudRegion}`;
  const registryName = `${parentName}/registries/${registryId}`;

  const request = {
    parent: registryName,
    //resource: body
    pageSize: 20,
  };
  return Rx.Observable.bindNodeCallback(
    client.projects.locations.registries.devices.list)(request);
}


async function main() {
  console.log('hello');
  let client = await makeClient();
  // console.log(client);
  console.log('there');
  let cursor;
  
  let items$ = Rx.Observable.of('')
    .expand(val => {
      return listDevices(client)
      .flatMap(d => Rx.Observable.from(d[0].devices))
      }).skip(1).take(30);

  //let items$ = listDevices(client);
  // items$.subscribe(v => console.log(v[0].devices));
  items$.subscribe(v => console.log(v));
}

main();
