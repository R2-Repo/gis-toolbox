/**
 * Assign npm package exports to globalThis for domain modules that expect browser globals.
 */
import maplibregl from 'maplibre-gl';
import 'maplibre-gl/dist/maplibre-gl.css';
import * as turf from '@turf/turf';
import Papa from 'papaparse';
import * as XLSX from 'xlsx';
import JSZip from 'jszip';
import toGeoJSON from '@mapbox/togeojson';
import shp from 'shpjs';
import * as exifr from 'exifr';
import proj4 from 'proj4';

export function bootstrapGlobals() {
    globalThis.maplibregl = maplibregl;
    globalThis.turf = turf;
    globalThis.Papa = Papa;
    globalThis.XLSX = XLSX;
    globalThis.JSZip = JSZip;
    globalThis.toGeoJSON = toGeoJSON;
    globalThis.shp = shp;
    globalThis.exifr = exifr;
    globalThis.proj4 = proj4;
}
