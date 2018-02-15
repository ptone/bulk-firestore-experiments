//const google = require('googleapis');
const google = require("googleapis-async");
const Rx = require('rxjs/Rx');


const API_VERSION = 'v1';
const DISCOVERY_API = 'https://cloudiot.googleapis.com/$discovery/rest';

const concurrentRequests:number = 1;

import { makeClient } from './createDevices';

const cloudRegion: string = "us-central1";
const registryId: string = "other-registry";
const projectId: string = "iot-provisioning";
const parentName = `projects/${projectId}/locations/${cloudRegion}`;
const registryName = `${parentName}/registries/${registryId}`;

function deleteDevice(client:any, deviceInfo:any) {
  // let deviceName = {'name':`${registryName}/${deviceInfo.numId}`};
  console.log('deleting', deviceInfo);
  return Rx.Observable.bindNodeCallback(
    client.projects.locations.registries.devices.delete)({name:`${registryName}/${deviceInfo.numId}`}); 
}

function listDevices(client:any, pageToken?:string) {


  const parentName = `projects/${projectId}/locations/${cloudRegion}`;
  const registryName = `${parentName}/registries/${registryId}`;

  const request: any = {
    parent: registryName,
    //resource: body
    pageSize: 1,
  };
  if (pageToken) {
    request['pageToken'] = pageToken;
  }
  return Rx.Observable.bindNodeCallback(
    client.projects.locations.registries.devices.list)(request);
}


async function main() {
  console.log('hello');
  let client = await makeClient();
  // console.log(client);
  console.log('there');
  let cursor:string;
  
  let items$ = Rx.Observable.of('')
    .expand(val => {
      return listDevices(client, cursor)
      .map(r => {
        //console.log('foo');
        //console.log(r[0].nextPageToken);
        cursor = r[0].nextPageToken;
        return r[0]
      })
      .flatMap(d => Rx.Observable.from(d.devices))
      }).skip(1);//.take(3000);

  //let items$ = listDevices(client);
  // items$.subscribe(v => console.log(v[0].devices));
  items$
  .mergeMap(deviceInfo => deleteDevice(client, deviceInfo),
    () => '',
    concurrentRequests)
  // .catch(e => {
  //   console.error(e);
  //   return Rx.Observable.of('error');
  //   }
  // 
  .subscribe(v => console.log("done"), e => console.log(e));
}

main();
