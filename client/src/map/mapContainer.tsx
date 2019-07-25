import React, { useState } from 'react';
import { Marker } from 'react-map-gl';
import produce from 'immer';

import { RouteComponentProps, withRouter } from 'react-router';

import useMapboxStyle from './shapeDraw/mapboxStyle';
import { MapboxButton } from '../common/button';
import { MQTT_URL } from '../location/urlPromptContainer';
import UbikampusMap from './ubikampusMap';
import QrCodeModal from './qrCodeModal';
import Deserializer, {
  MapLocationQueryDecoder,
  BeaconGeoLocation,
} from '../location/mqttDeserialize';
import { useUbiMqtt, urlForLocation } from '../location/mqttConnection';
import BluetoothNameModal from './bluetoothNameModal';
import { RaspberryLocation } from '../admin/adminPanel';
import {
  StaticUbiMarker,
  OfflineMarker,
  NonUserMarker,
  LocationPinMarker,
  divideMarkers,
} from './marker';
import { Location } from '../common/typeUtil';

const KUMPULA_COORDS = { lat: 60.2046657, lon: 24.9621132 };
const DEFAULT_NONTRACKED_ZOOM = 17;

/**
 * When user lands to the page with a position.
 */
const DEFAULT_TRACKED_ZOOM = 18;

interface Props {
  isAdminPanelOpen: boolean;
  getDeviceLocation: Location | null;
  setDeviceLocation(a: Location): void;
  devices: RaspberryLocation[];
  roomReserved: boolean;
}

const MapContainer = ({
  location,
  setDeviceLocation,
  isAdminPanelOpen,
  getDeviceLocation,
  devices,
  roomReserved,
}: RouteComponentProps & Props) => {
  const parser = new Deserializer();

  const queryParams =
    location.search === ''
      ? null
      : parser.parseQuery(MapLocationQueryDecoder, location.search);

  const fromQuery = !!(queryParams && queryParams.lat && queryParams.lon);
  const initialCoords =
    queryParams && queryParams.lat && queryParams.lon
      ? { lat: queryParams.lat, lon: queryParams.lon }
      : KUMPULA_COORDS;
  const [modalIsOpen, setModalIsOpen] = useState(false);
  const mapStyle = useMapboxStyle();
  const [modalText, setModalText] = useState('');
  const [nameSelection, setNameSelection] = useState<null | string>(null);

  const initialPinType = fromQuery ? 'show' : 'none';
  const [pinCoordinates, setPinCoordinates] = useState(initialCoords);
  const [pinType, setPinType] = useState<'configure' | 'show' | 'none'>(
    initialPinType
  );

  /**
   * Used when user selects "only current" from the location prompt.
   */
  const [staticLocations, setStaticLocations] = useState<BeaconGeoLocation[]>(
    []
  );
  const openModal = () => setModalIsOpen(true);
  const closeModal = () => setModalIsOpen(false);

  const [viewport, setViewport] = useState({
    latitude: initialCoords.lat,
    longitude: initialCoords.lon,
    zoom:
      queryParams && queryParams.lat
        ? DEFAULT_TRACKED_ZOOM
        : DEFAULT_NONTRACKED_ZOOM,
  });

  const [nameModalOpen, setNameModalOpen] = useState(
    queryParams && queryParams.lat ? true : false
  );

  const mqttHost =
    queryParams && queryParams.host ? queryParams.host : MQTT_URL;
  const [bluetoothName, setBluetoothName] = useState<string | null>(null);
  const { beacons, lastKnownPosition } = useUbiMqtt(
    mqttHost,
    bluetoothName,
    queryParams && queryParams.topic ? queryParams.topic : undefined
  );

  const { isOnline, allUserMarkers, nonUserMarkers } = divideMarkers(
    beacons,
    bluetoothName,
    lastKnownPosition
  );

  const UserMarker = isOnline ? Marker : OfflineMarker;

  const nextMapStyle =
    mapStyle === null
      ? null
      : produce(mapStyle, draft => {
          (draft.sources as any).geojsonSource.data.features[0].properties.colorMode = roomReserved
            ? 0
            : 1;
        });

  const staticMarkers = [...devices, ...staticLocations];

  const allStaticMarkers = getDeviceLocation
    ? [...staticMarkers, getDeviceLocation]
    : staticMarkers;

  return (
    <>
      <MapboxButton className="mapboxgl-ctrl mapboxgl-ctrl-group">
        <button
          onClick={() => setNameModalOpen(true)}
          className="mapboxgl-ctrl-icon mapboxgl-ctrl-geolocate"
        />
      </MapboxButton>
      {nextMapStyle && (
        <UbikampusMap
          mapStyle={nextMapStyle}
          onClick={e => {
            const [lon, lat] = e.lngLat;

            if (isAdminPanelOpen) {
              setDeviceLocation({ lon, lat });
            } else {
              setModalText(urlForLocation(queryParams, lon, lat));
              setPinType('configure');
              setPinCoordinates({ lat, lon });
            }
          }}
          viewport={viewport}
          pointerCursor={isAdminPanelOpen}
          setViewport={setViewport}
        >
          <QrCodeModal
            modalIsOpen={modalIsOpen}
            closeModal={closeModal}
            modalText={modalText}
          />
          <BluetoothNameModal
            promptForName // TODO: Don't prompt if web bluetooth succeeds.
            setStaticLocation={name => {
              const targetBeacons = beacons.filter(b => b.beaconId === name);
              setStaticLocations(targetBeacons);
            }}
            isOpen={nameModalOpen}
            closeModal={() => setNameModalOpen(false)}
            beacons={beacons}
            nameSelection={nameSelection}
            setNameSelection={setNameSelection}
            setBluetoothName={name => {
              setBluetoothName(name);
              setNameModalOpen(false);
            }}
          />
          <LocationPinMarker
            coords={pinCoordinates}
            onClick={openModal}
            type={pinType}
          />
          {allStaticMarkers.map((device, i) => (
            <StaticUbiMarker
              key={'raspberry-' + i}
              latitude={device.lat}
              longitude={device.lon}
            />
          ))}
          {allUserMarkers.map((marker, i) => (
            <UserMarker
              key={i}
              latitude={marker.lat}
              longitude={marker.lon}
              className="mapboxgl-user-location-dot"
            />
          ))}
          {nonUserMarkers.map((beacon, i) => (
            <NonUserMarker
              key={i}
              latitude={beacon.lat}
              longitude={beacon.lon}
              className="mapboxgl-user-location-dot"
            />
          ))}
        </UbikampusMap>
      )}
    </>
  );
};

export default withRouter(MapContainer);