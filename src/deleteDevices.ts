//const google = require('googleapis');
// const google = require("googleapis-async");
var {google} = require('googleapis');
const Rx = require('rxjs/Rx');


const concurrentRequests:number = 25;
const batchSize:number = 30;

// import { makeClient } from './createDevices';

const cloudRegion: string = "us-central1";
const registryId: string = "t-registry";
const projectId: string = "iot-provisioning";
const parentName = `projects/${projectId}/locations/${cloudRegion}`;
const registryName = `${parentName}/registries/${registryId}`;
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

function deleteDevice(client:any, deviceInfo:any) {
  // let deviceName = {'name':`${registryName}/${deviceInfo.numId}`};
  // console.log('deletin', deviceInfo);
  //return Rx.Observable.of(deviceInfo.numId);
  return Rx.Observable.bindNodeCallback(
    client.projects.locations.registries.devices.delete)({name:`${registryName}/devices/${deviceInfo.numId}`}); 
}

function listDevices(client:any, pageToken?:string) {

  console.log("list");
  const parentName = `projects/${projectId}/locations/${cloudRegion}`;
  const registryName = `${parentName}/registries/${registryId}`;
  console.log(pageToken);
  const request: any = {
    parent: registryName,
    //resource: body
    pageSize: batchSize,
  };
  if (pageToken) {
    request['pageToken'] = pageToken;
  }
  console.log(request);
  // client.projects.locations.registries.devices.list(request, function(r, err){
  //   console.log('result');
  //   console.log(r);
  //   console.log('result');
  //   console.log(err);
  // });
  return Rx.Observable.bindNodeCallback(
    client.projects.locations.registries.devices.list)(request);
}


async function main() {
  const adc = await getADC();
  let client = google.cloudiot({
    version: 'v1',
    auth: adc.client
  })
  
  let cursor:string;
  let cursorEnd$ = new Rx.Subject();
  
  // ugh: https://stackoverflow.com/questions/35343183/rxjs-control-observable-invocation

  let items$ = Rx.Observable.of('')
    .expand(val => {
      return listDevices(client, cursor)
      // .controlled()
      .map(r => {
        //console.log('foo');
        //console.log(r[0].nextPageToken);
        // console.log(r.data);
        if (!r.data.nextPageToken && cursor) {
          // next page token has gone back to null - end of list
          console.log("ending paginator");
          cursorEnd$.next("stop");
          return {}
        }
        cursor = r.data.nextPageToken;
        return r.data;
        // console.log('------------------');
        // cursor = r[0].nextPageToken;
        // return r[0]
      })
    }).skip(1).takeUntil(cursorEnd$.asObservable())
      .flatMap(d => {
        // console.log(d.devices.length);
        return Rx.Observable.from(d.devices);
      }).takeUntil(cursorEnd$.asObservable(); //.take(3000);

  //let items$ = listDevices(client);
  // items$.subscribe(v => console.log(v[0].devices));
  items$
  .mergeMap(deviceInfo => deleteDevice(client, deviceInfo),
    () => '',
    // (oVal, iVal, oIndex, iIndex) => [oIndex, oVal, iIndex, iVal],
    concurrentRequests)
  // .catch(e => {
  //   console.error(e);
  //   return Rx.Observable.of('error');
  //   }
  // 
  .subscribe(v => console.log('ok'), e => console.log(e));
}

main();
