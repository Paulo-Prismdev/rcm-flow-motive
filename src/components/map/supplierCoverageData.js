// Supplier coverage areas — extend with more suppliers as needed
// radius_miles controls the coverage circle drawn around each site
// nationwide: true = single large circle covering the whole UK (no site markers)

export const SUPPLIER_COVERAGE_AREAS = [
  {
    supplier_name: "Group 1",
    color: "#3b82f6", // blue-500
    radius_miles: 30,
    coverage_polygon: [
      // South coast — follow the coastline eastward from Reading area
      [51.30, -1.30], [51.20, -1.05], [51.00, -0.80], [50.78, -0.55],
      [50.72, -0.30], [50.70, -0.10], [50.72, 0.10], [50.78, 0.30],
      [50.85, 0.45], [50.95, 0.55], [51.10, 0.60], [51.25, 0.65],
      [51.40, 0.75], [51.55, 0.85], [51.70, 0.95], [51.85, 1.05],
      // East coast — follow the coastline northward
      [52.00, 1.20], [52.15, 1.30], [52.30, 1.40], [52.45, 1.45],
      [52.60, 1.40], [52.75, 1.35], [52.90, 1.25], [53.00, 1.10],
      [53.05, 0.80], [53.10, 0.50], [53.15, 0.20], [53.10, -0.05],
      [53.05, -0.25], [53.00, -0.40],
      // Inland — round off through Northampton then Oxford
      [52.90, -0.55], [52.60, -0.75], [52.35, -0.85], [52.24, -0.88],
      [52.10, -0.90], [51.95, -0.95], [51.85, -1.05], [51.75, -1.26],
      [51.65, -1.20], [51.55, -1.15], [51.45, -1.20], [51.35, -1.25],
      [51.30, -1.30]
    ],
    sites: [
      { location: "Farnborough", site_name: "Group 1 BMW", address: "105 Farnborough Rd, Farnborough GU14 6TL, UK", lat: 51.2848, lng: -0.7535 },
      { location: "Hailsham", site_name: "Group 1 BMW", address: "Gleneagles Dr, Hailsham BN27 3UA, UK", lat: 50.8627, lng: 0.2442 },
      { location: "Worthing", site_name: "Group 1 BMW", address: "Manor Retail Park, Rustington, Littlehampton BN16 3FH, UK", lat: 50.8188, lng: -0.5026 },
      { location: "Bedford", site_name: "Group 1 BMW", address: "Caxton Rd, Bedford MK41 0GL, UK", lat: 52.1459, lng: -0.4167 },
      { location: "Cambridge", site_name: "Group 1 BMW", address: "Sheepfold Ln, Great Cambourne, Cambourne, Cambridge CB23 6EF, UK", lat: 52.2235, lng: -0.0741 },
      { location: "Southend", site_name: "Group 1 Land Rover", address: "Cherry Orchard Way, Rochford SS4 1GP, UK", lat: 51.5715, lng: 0.6811 },
      { location: "Borehamwood", site_name: "Group 1 BMW", address: "Stirling Way, Borehamwood WD6 2BT, UK", lat: 51.6451, lng: -0.2543 },
      { location: "Ruislip", site_name: "Group 1 BMW Servicing", address: "2 Bradfield Rd, Ruislip HA4 0NU, UK", lat: 51.5556, lng: -0.3794 },
      { location: "Watford", site_name: "Group 1 Land Rover", address: "Lower High St, Watford WD17 2JX, UK", lat: 51.6478, lng: -0.3847 },
      { location: "Lincoln", site_name: "Group 1 Assured", address: "Roman Way, South Hykeham, Lincoln LN6 9UH, UK", lat: 53.1779, lng: -0.6193 },
      { location: "Chelmsford", site_name: "Group 1 BMW", address: "Colchester Rd, Springfield, Chelmsford, Essex CM2 5PG, UK", lat: 51.7508, lng: 0.5142 },
      { location: "Ipswich", site_name: "Group 1 BMW", address: "667 Norwich Rd, Ipswich IP1 6HA, UK", lat: 52.081, lng: 1.1242 },
      { location: "Colchester", site_name: "Group 1 BMW", address: "Ipswich Rd, Ardleigh, Colchester CO4 9TD, UK", lat: 51.9198, lng: 0.9336 },
      { location: "Reading", site_name: "Group 1 BMW", address: "Drake Way, Reading, Berkshire RG2 0GH, UK", lat: 51.4289, lng: -0.9782 },
      { location: "Norwich", site_name: "Group 1 Assured", address: "481-489 Hall Rd, Norwich NR4 6ET, UK", lat: 52.6049, lng: 1.2864 },
    ]
  },
  {
    supplier_name: "Tomo",
    color: "#f97316", // orange-500
    radius_miles: 400,
    nationwide: true,
    sites: [
      { location: "Nationwide", site_name: "Tomo", address: "Nationwide coverage — all UK bodyshops", lat: 54.5, lng: -2.5 },
    ]
  }
];

// Convert miles to meters for Leaflet Circle radius
export const milesToMeters = (miles) => miles * 1609.34;