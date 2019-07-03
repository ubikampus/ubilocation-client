import React from 'react';
import { MemoryRouter, Route } from 'react-router';
import { mount } from 'enzyme';
import { exampleMessages } from '../location/mqttDeserializeTest';
import { MockBusContainer, GenuineBusContainer } from './screenContainer';

const mockDispose = jest.fn();
const mockUpdateBeacons = jest.fn();

jest.mock('ubimqtt', () => {
  return jest.fn().mockImplementation(() => {
    const subscribe = jest
      .fn()
      .mockImplementation((topic: string, b: any, cb: any) =>
        cb(topic, JSON.stringify(exampleMessages()))
      );

    return {
      connect: jest.fn().mockImplementation(cb => cb(null)),
      subscribe,
      forceDisconnect: jest.fn().mockImplementation(cb => cb()),
    };
  });
});

jest.mock('./screen3d', () => {
  return jest.fn().mockImplementation(() => {
    return {
      dispose: mockDispose,
      updateBeacons: mockUpdateBeacons,
      addBeacon: jest.fn(),
    };
  });
});

const mockStop = jest.fn();

jest.mock('../location/mqttConnection', () => {
  return {
    FakeMqttGenerator: jest.fn().mockImplementation(() => {
      return {
        stop: mockStop,
      };
    }),
  };
});

describe('3d screen container components', () => {
  it('should stop mock interval timer after unmount', done => {
    mockStop.mockImplementation(() => {
      done();
    });

    const rendered = mount(
      <MemoryRouter initialEntries={['/mockviz']}>
        <Route exact path={'/mockviz'} component={MockBusContainer} />
      </MemoryRouter>
    );
    rendered.unmount();
  });

  it('should dispose BabylonJS engine after unmounting', done => {
    mockDispose.mockImplementation(() => {
      done();
    });

    const rendered = mount(
      <MemoryRouter initialEntries={['/viz?host=abc&topic=abc']}>
        <Route exact path={'/viz'} component={GenuineBusContainer} />
      </MemoryRouter>
    );

    rendered.unmount();
  });

  it('should panic when topic is missing from query string', () => {
    const component = (
      <MemoryRouter initialEntries={['/viz?host=abc']}>
        <Route exact path={'/viz'} component={GenuineBusContainer} />
      </MemoryRouter>
    );

    expect(() => mount(component)).toThrow();
  });

  it('should call setPosition when the beacons move', done => {
    mockUpdateBeacons.mockImplementation(() => {
      done();
    });

    mount(
      <MemoryRouter initialEntries={['/viz?host=abc&topic=abc']}>
        <Route exact path={'/viz'} component={GenuineBusContainer} />
      </MemoryRouter>
    );
  });
});