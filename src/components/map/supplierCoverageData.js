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
    supplier_name: "Barrett's",
    color: "#ef4444", // red-500
    radius_miles: 30,
    coverage_polygon: [
      [51.030, -0.290], [51.000, -0.190], [50.980, -0.080], [50.810, -0.055],
      [50.780, 0.003], [50.750, 0.130], [50.720, 0.210], [50.750, 0.320],
      [50.790, 0.460], [50.820, 0.530], [50.840, 0.660], [50.830, 0.780],
      [50.890, 0.900], [50.960, 1.010], [51.020, 1.100], [51.060, 1.260],
      [51.110, 1.400], [51.200, 1.470], [51.290, 1.530], [51.370, 1.490],
      [51.410, 1.400], [51.420, 1.280], [51.420, 1.160], [51.420, 1.060],
      [51.440, 0.960], [51.480, 0.890], [51.500, 0.810], [51.580, 0.780],
      [51.610, 0.700], [51.650, 0.620], [51.730, 0.530], [51.750, 0.380],
      [51.720, 0.230], [51.680, 0.090], [51.640, -0.010], [51.600, -0.090],
      [51.560, -0.160], [51.520, -0.190], [51.470, -0.040], [51.430, -0.080],
      [51.380, -0.130], [51.330, -0.170], [51.270, -0.200], [51.200, -0.230],
      [51.130, -0.230], [51.070, -0.250], [51.030, -0.290]
    ],
    sites: []
  },
  {
    supplier_name: "Tomo",
    color: "#f97316", // orange-500
    radius_miles: 30,
    coverage_polygon: [
      [58.7112, -3.0899], [58.6498, -5.0317], [57.9819, -5.5316],
      [57.8740, -5.8640], [57.3739, -5.8969], [57.5983, -5.9491],
      [57.4686, -6.1194], [57.7393, -6.3116], [57.4656, -6.8115],
      [57.0557, -5.8365], [56.8580, -5.8420], [56.7437, -6.2622],
      [56.4397, -6.5149], [56.3622, -6.2430], [56.2769, -6.5039],
      [56.4534, -5.4904], [55.9646, -6.0617], [55.8953, -6.4764],
      [55.6497, -6.5341], [55.6419, -6.0013], [56.0935, -5.6470],
      [55.2838, -5.8200], [55.2635, -5.5371], [55.6078, -5.4355],
      [55.4228, -5.0784], [55.8152, -5.2570], [55.5022, -4.6802],
      [54.9839, -5.2213], [54.6579, -5.0153], [54.6166, -4.8257],
      [54.8260, -4.8395], [54.6516, -4.3890], [54.8149, -4.3204],
      [54.9382, -3.3371], [54.4988, -3.6777], [54.0304, -3.2355],
      [54.1126, -2.8619], [53.9270, -3.0762], [53.7113, -2.9883],
      [53.3309, -3.2108], [53.3210, -4.7351], [53.0858, -4.3726],
      [52.7263, -4.8203], [52.8857, -4.1913], [52.3773, -4.1528],
      [51.8765, -5.3833], [51.8443, -5.1471], [51.6981, -5.3366],
      [51.6061, -5.1086], [51.7185, -4.5483], [51.3769, -3.5568],
      [51.5378, -2.7411], [51.2344, -3.0597], [51.2396, -4.2188],
      [50.3612, -5.1773], [50.1681, -5.7101], [50.0148, -5.7019],
      [49.9388, -5.1773], [50.3332, -4.4055], [50.1804, -3.7051],
      [50.5832, -3.4167], [50.6999, -2.9031], [50.4925, -2.4637],
      [50.7052, -1.6891], [50.5483, -1.3239], [50.7521, -1.0876],
      [50.7139, 0.2719], [51.1483, 1.4255], [51.3906, 1.4722],
      [51.4694, 0.7581], [52.0761, 1.6068], [52.7513, 1.7166],
      [52.9883, 1.0574], [52.9238, 0.1126], [53.1336, 0.4175],
      [54.0045, -0.1730], [54.1319, -0.0330], [54.7611, -1.2415],
      [55.5473, -1.5958], [55.9092, -2.0819], [56.0690, -2.5790],
      [55.9953, -3.2327], [56.2815, -2.5543], [56.4534, -2.7686],
      [57.4523, -1.7496], [57.7262, -2.0929], [57.6101, -4.0430],
      [57.8827, -3.7299], [57.9382, -3.9578], [58.3080, -3.1311],
      [58.7112, -3.0899]
    ],
    sites: []
  },
  {
    supplier_name: "Smith's",
    color: "#10b981", // emerald-500
    radius_miles: 30,
    coverage_polygon: [
      [51.358, -0.668], [51.373, -0.493], [51.322, -0.273],
      [51.393, -0.143], [52.643, 0.244], [53.102, -0.426],
      [53.111, -0.988], [53.093, -1.352], [52.700, -1.338],
      [51.920, -0.938], [51.609, -0.796]
    ],
    sites: []
  }
];

// Convert miles to meters for Leaflet Circle radius
export const milesToMeters = (miles) => miles * 1609.34;