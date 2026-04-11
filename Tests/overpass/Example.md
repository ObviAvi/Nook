Quick Start (60 seconds): for Developers/Programmers
Note: this approach retrieves raw data, and while this example uses Javascript, with JSON output, the API works with effectively any language and has many output formats.

(Be ready to ignore the following "Error: encoding error: Your input contains only whitespace." which just means "no query was given")
Open https://overpass-api.de/api/interpreter in a new tab
Open your browser's console while on that page
Paste the code snippet below (and press ↵ Enter)
var query = `
  [bbox:30.618338,-96.323712,30.591028,-96.330826]
  [out:json]
  [timeout:90]
  ;
  way(30.626917110746, -96.348809105664, 30.634468750236, -96.339893442898);
  out geom;
`;
var result = await fetch(
  "https://overpass-api.de/api/interpreter",
  {
    method: "POST",
    body: "data=" + encodeURIComponent(query),
  }
).then((data) => data.json());

console.log(JSON.stringify(result, null, 2));
You should then see something similar to the following:
  {
    version: 0.6,
    generator: "Overpass API 0.7.61.5 4133829e",
    osm3s: {
      timestamp_osm_base: "2023-10-17T15:22:15Z",
      copyright: "The data included in this document is from www.openstreetmap.org. The data "...
    },
    elements: [
      {
        type: "way",
        id: 20714383,
        bounds: {
          minlat: 30.6277358,
          minlon: -96.341929,
          maxlat: 30.628834,
          maxlon: -96.340566
        },
        nodes: [ 222454378, 4204990218, 222454386 ],
        geometry: [
          { lat: 30.6277358, lon: -96.340566 },
          { lat: 30.6278459, lon: -96.3407026 },
          { lat: 30.628834, lon: -96.341929 }
        ],
        tags: {
          highway: "service",
          name: "W-X Street",
          postal_code: "77840",
          "tiger:county": "Brazos, TX"
        }
      },
 
 ...
Usually, the output will be truncated. To see the full response:
Go to the Network tab.
Select the last line.
Go to the Response inner tab.
