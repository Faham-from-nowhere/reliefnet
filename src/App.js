import './index.css';

import React, { useState, useEffect, createContext, useContext, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, signInWithCustomToken, onAuthStateChanged } from 'firebase/auth';
import { getFirestore, doc, collection, onSnapshot, addDoc, updateDoc, query, where } from 'firebase/firestore';

// Context for Firebase services and user information
const FirebaseContext = createContext(null);

// Custom Hook to use Firebase Context
const useFirebase = () => useContext(FirebaseContext);

// Utility function to get the app ID, falling back for local development
const getAppId = () =>
  process.env.REACT_APP_APP_ID || 'dev-reliefnet';

const getFirebaseConfig = () => ({
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
  measurementId: process.env.REACT_APP_FIREBASE_MEASUREMENT_ID
});

  





// Google Maps API Key (provided by user)
const GOOGLE_MAPS_API_KEY = process.env.REACT_APP_GOOGLE_MAPS_API_KEY

const App = () => {
    const [db, setDb] = useState(null);
    const [auth, setAuth] = useState(null);
    const [userId, setUserId] = useState(null);
    const [isAuthReady, setIsAuthReady] = useState(false);
    const [currentPage, setCurrentPage] = useState('dashboard'); // State for navigation
    const [userRole, setUserRole] = useState('victim'); // Default role: victim

    const appId = getAppId();
    const firebaseConfig = getFirebaseConfig();

    useEffect(() => {
        if (!firebaseConfig) {
            console.error("Firebase config is missing. Please ensure __firebase_config is set.");
            return;
        }

        // Initialize Firebase
        const app = initializeApp(firebaseConfig);
        const firestoreDb = getFirestore(app);
        const firebaseAuth = getAuth(app);

        setDb(firestoreDb);
        setAuth(firebaseAuth);

        // Listen for auth state changes
        const unsubscribe = onAuthStateChanged(firebaseAuth, async (user) => {
            if (user) {
                setUserId(user.uid);
            } else {
                // If no user, sign in anonymously or with custom token
                try {
                    const token = process.env.REACT_APP_CUSTOM_AUTH_TOKEN;
if (token) {
    await signInWithCustomToken(firebaseAuth, token);
} else {
    await signInAnonymously(firebaseAuth);
}

                    setUserId(firebaseAuth.currentUser?.uid || crypto.randomUUID()); // Ensure userId is set after sign-in
                } catch (error) {
                    console.error("Error signing in:", error);
                    // Fallback for anonymous if custom token fails
                    try {
                        await signInAnonymously(firebaseAuth);
                        setUserId(firebaseAuth.currentUser?.uid || crypto.randomUUID());
                    } catch (anonError) {
                        console.error("Error signing in anonymously:", anonError);
                        setUserId(crypto.randomUUID()); // Use a random ID if all else fails
                    }
                }
            }
            setIsAuthReady(true);
        });

        // Register Service Worker for Offline Mode
        /*if ('serviceWorker' in navigator) {
            window.addEventListener('load', () => {
                navigator.serviceWorker.register('/service-worker.js')
                    .then(registration => {
                        console.log('Service Worker registered with scope:', registration.scope);
                    })
                    .catch(error => {
                        console.error('Service Worker registration failed:', error);
                    });
            });
        }*/


        // Cleanup subscription on unmount
        return () => unsubscribe();
    }, [firebaseConfig]);

    if (!isAuthReady) {
        return (
            <div className="flex items-center justify-center min-h-screen bg-gray-100">
                <div className="text-xl font-semibold text-gray-700">Loading ReliefNet...</div>
            </div>
        );
    }

    return (
        <FirebaseContext.Provider value={{ db, auth, userId, appId, userRole, setUserRole }}>
            <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 font-inter antialiased">
                <Header setCurrentPage={setCurrentPage} userRole={userRole} setUserRole={setUserRole} />
                <main className="container mx-auto px-4 py-8">
                    {userId && (
                        <div className="mb-6 p-4 bg-blue-100 border border-blue-200 text-blue-800 rounded-lg shadow-sm">
                            <p className="text-sm">
                                <span className="font-semibold">Your User ID:</span> {userId}
                            </p>
                            <p className="text-xs mt-1">
                                (Share this ID for multi-user features or for others to find you.)
                            </p>
                        </div>
                    )}
                    {currentPage === 'dashboard' && <DashboardPage />}
                    {currentPage === 'map' && <DisasterMapPage />}
                    {currentPage === 'report' && <ReportSystemPage />}
                    {currentPage === 'requests' && <ResourceRequestsPage />}
                    {currentPage === 'updates' && <RealTimeUpdatesPage />}
                    {currentPage === 'volunteer' && <VolunteerCoordinationPage />}
                </main>
            </div>
        </FirebaseContext.Provider>
    );
};

const Header = ({ setCurrentPage, userRole, setUserRole }) => {
    return (
        <header className="bg-white shadow-md py-4 px-6 md:px-10 rounded-b-2xl">
            <div className="container mx-auto flex flex-col md:flex-row items-center justify-between">
                <h1 className="text-3xl font-extrabold text-blue-700 mb-4 md:mb-0">
                    <span className="text-blue-500">Relief</span>Net
                </h1>
                <nav className="flex flex-wrap justify-center gap-3 mb-4 md:mb-0">
                    <NavItem onClick={() => setCurrentPage('dashboard')}>Dashboard</NavItem>
                    <NavItem onClick={() => setCurrentPage('map')}>Disaster Map</NavItem>
                    <NavItem onClick={() => setCurrentPage('report')}>Report System</NavItem>
                    <NavItem onClick={() => setCurrentPage('requests')}>Resource Requests</NavItem>
                    <NavItem onClick={() => setCurrentPage('updates')}>Real-Time Updates</NavItem>
                    <NavItem onClick={() => setCurrentPage('volunteer')}>Volunteer Hub</NavItem>
                </nav>
                <div className="flex items-center gap-2">
                    <label htmlFor="roleSelect" className="text-sm font-medium text-gray-700">Role:</label>
                    <select
                        id="roleSelect"
                        value={userRole}
                        onChange={(e) => setUserRole(e.target.value)}
                        className="p-2 border border-gray-300 rounded-md shadow-sm text-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="victim">Victim</option>
                        <option value="volunteer">Volunteer</option>
                        <option value="ngo">NGO</option>
                        <option value="admin">Admin</option>
                    </select>
                </div>
            </div>
        </header>
    );
};

const NavItem = ({ children, onClick }) => (
    <button
        onClick={onClick}
        className="px-4 py-2 rounded-lg text-sm font-medium text-gray-700 bg-gray-100 hover:bg-blue-100 hover:text-blue-700 transition duration-200 ease-in-out shadow-sm border border-gray-200 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
    >
        {children}
    </button>
);

const Card = ({ title, children }) => (
    <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-200">
        <h2 className="text-xl font-semibold text-gray-800 mb-4">{title}</h2>
        {children}
    </div>
);

// Geocoding function using Google Geocoding API
const getCoordinatesFromLocation = async (location) => {
    if (!location) return { latitude: null, longitude: null };

    const encodedLocation = encodeURIComponent(location);
    const geocodingUrl = `https://maps.googleapis.com/maps/api/geocode/json?address=${encodedLocation}&key=${GOOGLE_MAPS_API_KEY}`;

    try {
        const response = await fetch(geocodingUrl);
        const data = await response.json();

        if (data.status === 'OK' && data.results.length > 0) {
            const { lat, lng } = data.results[0].geometry.location;
            return { latitude: lat, longitude: lng };
        } else {
            console.warn(`Geocoding failed for "${location}": ${data.status}`);
            return { latitude: null, longitude: null, status: data.status }; // Return status for better error handling
        }
    } catch (error) {
        console.error("Error during geocoding API call:", error);
        return { latitude: null, longitude: null, status: 'NETWORK_ERROR' };
    }
};


// --- Page Components ---

const DashboardPage = () => {
    const { db, appId } = useFirebase();
    const [latestUpdates, setLatestUpdates] = useState([]);

    useEffect(() => {
        if (!db) return;
        const broadcastsCollectionRef = collection(db, `artifacts/${appId}/public/data/broadcasts`);
        const q = query(broadcastsCollectionRef); // Add orderBy for latest broadcasts if needed
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const updates = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
                                    .sort((a, b) => b.timestamp - a.timestamp) // Sort by latest
                                    .slice(0, 3); // Get top 3 latest
            setLatestUpdates(updates);
        }, (err) => {
            console.error("Error fetching latest updates:", err);
        });
        return () => unsubscribe();
    }, [db, appId]);

    return (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            <Card title="Welcome to ReliefNet!">
                <p className="text-gray-600 mb-4">
                    Your real-time disaster coordination platform. Select a module from the navigation to get started.
                </p>
                <div className="text-sm text-gray-500">
                    <p>Access different features based on your role:</p>
                    <ul className="list-disc list-inside mt-2">
                        <li>Victim: Report needs, find shelters.</li>
                        <li>Volunteer: Respond to requests, log aid.</li>
                        <li>NGO: Coordinate efforts, push updates.</li>
                        <li>Admin: Oversee operations, verify info.</li>
                    </ul>
                </div>
            </Card>
            <Card title="Key Statistics (Coming Soon)">
                <p className="text-gray-600">
                    Real-time data on active requests, available volunteers, and aid delivered will be displayed here.
                </p>
                <div className="mt-4 p-3 bg-yellow-50 rounded-lg text-yellow-800 text-sm">
                    <p className="font-medium">Placeholder:</p>
                    <p>Total Active Requests: <span className="font-semibold">0</span></p>
                    <p>Volunteers Online: <span className="font-semibold">0</span></p>
                </div>
            </Card>
            <Card title="Latest Updates">
                {latestUpdates.length === 0 ? (
                    <p className="text-gray-600">No updates available yet.</p>
                ) : (
                    <ul className="space-y-3">
                        {latestUpdates.map(update => (
                            <li key={update.id} className="p-3 bg-green-50 rounded-lg text-green-800 text-sm border border-green-200">
                                <p className="font-semibold">{update.title}</p>
                                <p>{update.message}</p>
                                <p className="text-xs text-gray-500 mt-1">
                                    {update.timestamp?.toDate().toLocaleString() || 'N/A'}
                                </p>
                            </li>
                        ))}
                    </ul>
                )}
                {/* No explicit onClick to reload, as it's not standard practice. User can navigate to the dedicated page. */}
                <span className="text-sm text-blue-600 mt-4 block">
                    Go to "Real-Time Updates" to view all.
                </span>
            </Card>
        </div>
    );
};

const DisasterMapPage = () => {
    const { db, appId } = useFirebase();
    const mapRef = useRef(null);
    const [reports, setReports] = useState([]);
    const [requests, setRequests] = useState([]);
    const [map, setMap] = useState(null); // State to store the Google Map instance
    const [isGoogleMapsLoaded, setIsGoogleMapsLoaded] = useState(false);
    const [mapLoadError, setMapLoadError] = useState(null);

    // Load Google Maps Script
    useEffect(() => {
        const loadGoogleMaps = () => {
            if (window.google && window.google.maps) {
                console.log("Google Maps script already loaded.");
                setIsGoogleMapsLoaded(true);
                return;
            }
            console.log("Loading Google Maps script...");
            const script = document.createElement('script');
            script.src = `https://maps.googleapis.com/maps/api/js?key=${GOOGLE_MAPS_API_KEY}&libraries=geometry,places`;
            script.async = true;
            script.defer = true;
            script.onload = () => {
                console.log("Google Maps script loaded.");
                setIsGoogleMapsLoaded(true);
                setMapLoadError(null);
            };
            script.onerror = () => {
                console.error("Error loading Google Maps script. Check network or API key.");
                setIsGoogleMapsLoaded(false); // Ensure this is set to false on error
                setMapLoadError("Failed to load Google Maps script. Check your internet connection or API key in the code.");
            };
            document.head.appendChild(script);
        };
        loadGoogleMaps();
    }, []);

    // Initialize Map and Fetch Data
    useEffect(() => {
        if (!db || !isGoogleMapsLoaded || !window.google || !window.google.maps || !mapRef.current) {
            // console.log("Map initialization conditions not met:", {db: !!db, isGoogleMapsLoaded, google: !!window.google, maps: !!window.google.maps, mapRef: !!mapRef.current});
            return;
        }

        // Initialize the map if it hasn't been initialized yet
        if (!map) {
            try {
                const initialMap = new window.google.maps.Map(mapRef.current, {
                    center: { lat: 20.5937, lng: 78.9629 }, // Center of India, adjust as needed
                    zoom: 5,
                    mapId: 'DEMO_MAP_ID', // Use a demo map ID or your own
                });
                setMap(initialMap);
                setMapLoadError(null); // Clear any previous map load errors
            } catch (error) {
                console.error("Error initializing Google Map:", error);
                setMapLoadError("Failed to initialize map. Ensure Maps JavaScript API is enabled for your project.");
            }
        }

        // Fetch reports
        const reportsCollectionRef = collection(db, `artifacts/${appId}/public/data/reports`);
        const unsubscribeReports = onSnapshot(reportsCollectionRef, (snapshot) => {
            const fetchedReports = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setReports(fetchedReports);
        }, (err) => {
            console.error("Error fetching reports for map:", err);
            // setMapLoadError("Error fetching reports data for map."); // Consider adding more specific data load errors
        });

        // Fetch requests
        const requestsCollectionRef = collection(db, `artifacts/${appId}/public/data/resourceRequests`);
        const unsubscribeRequests = onSnapshot(requestsCollectionRef, (snapshot) => {
            const fetchedRequests = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setRequests(fetchedRequests);
        }, (err) => {
            console.error("Error fetching requests for map:", err);
            // setMapLoadError("Error fetching requests data for map.");
        });

        return () => {
            unsubscribeReports();
            unsubscribeRequests();
        };
    }, [db, appId, map, isGoogleMapsLoaded]);


    // Add Markers to Map
    useEffect(() => {
        if (!map) return;

        // Clear existing markers if any (for re-rendering based on data changes)
        if (map.markers) {
            map.markers.forEach(marker => marker.setMap(null));
        }
        map.markers = []; // Reset markers array

        // Add report markers
        reports.forEach(report => {
            if (report.latitude && report.longitude) {
                const marker = new window.google.maps.Marker({
                    position: { lat: report.latitude, lng: report.longitude },
                    map,
                    title: `Report: ${report.reportType} - ${report.details}`,
                    icon: {
                        url: "http://maps.google.com/mapfiles/ms/icons/red-dot.png" // Red for reports
                    }
                });
                map.markers.push(marker);
            }
        });

        // Add request markers
        requests.forEach(request => {
            if (request.latitude && request.longitude) {
                const marker = new window.google.maps.Marker({
                    position: { lat: request.latitude, lng: request.longitude },
                    map,
                    title: `Request: ${request.requestType} - ${request.description}`,
                    icon: {
                        url: "http://maps.google.com/mapfiles/ms/icons/blue-dot.png" // Blue for requests
                    }
                });
                map.markers.push(marker);
            }
        });
    }, [map, reports, requests]);

    return (
        <Card title="Disaster Map: Real-time Incidents & Needs">
            <p className="text-gray-600 mb-4">
                This interactive map displays geo-tagged reports of incidents (missing persons, injuries) and resource requests, allowing for real-time visualization of disaster zones.
            </p>
            {mapLoadError && (
                <div className="w-full p-3 mb-4 bg-red-100 border border-red-200 text-red-700 rounded-lg">
                    <p className="font-semibold">Map Error:</p>
                    <p>{mapLoadError}</p>
                    <p className="text-sm mt-2">
                        Please verify your Google Maps API Key and ensure both "Maps JavaScript API" and "Geocoding API" are enabled in your Google Cloud Project.
                    </p>
                </div>
            )}
            {!isGoogleMapsLoaded && !mapLoadError ? (
                <div className="w-full h-96 flex items-center justify-center bg-gray-100 rounded-lg border border-gray-300 text-gray-700 text-center p-4 mb-4">
                    <p>Loading Google Maps script...</p>
                </div>
            ) : isGoogleMapsLoaded && !map && !mapLoadError ? (
                <div className="w-full h-96 flex items-center justify-center bg-gray-100 rounded-lg border border-gray-300 text-gray-500 text-center p-4 mb-4">
                    <p>Initializing Map...</p>
                </div>
            ) : null}

            <div
                ref={mapRef}
                className="w-full h-96 bg-gray-200 rounded-lg border border-gray-400"
                style={{ display: map ? 'block' : 'none' }} // Hide until map is ready
            >
            </div>
            <p className="text-sm text-gray-500 mt-4">
                Red markers indicate reports (missing persons, injuries). Blue markers indicate resource requests (food, water, shelter).
            </p>
        </Card>
    );
};

const ReportSystemPage = () => {
    const { db, userId, appId } = useFirebase();
    const [reportType, setReportType] = useState('missing');
    const [details, setDetails] = useState('');
    const [location, setLocation] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState('');
    const [manualLat, setManualLat] = useState(null);
    const [manualLng, setManualLng] = useState(null);

    const handleUseCurrentLocation = () => {
        setMessage('Attempting to get your current location...');
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    setManualLat(position.coords.latitude);
                    setManualLng(position.coords.longitude);
                    setLocation('Your Current Location'); // Indicate that it's geolocation-based
                    setMessage('Current location detected!');
                },
                (error) => {
                    console.error("Error getting geolocation:", error);
                    let errorMessage = "Failed to get current location. ";
                    switch (error.code) {
                        case error.PERMISSION_DENIED:
                            errorMessage += "Please allow location access in your browser settings.";
                            break;
                        case error.POSITION_UNAVAILABLE:
                            errorMessage += "Location information is unavailable.";
                            break;
                        case error.TIMEOUT:
                            errorMessage += "The request to get user location timed out.";
                            break;
                        default:
                            errorMessage += "An unknown error occurred.";
                            break;
                    }
                    setMessage(`Error: ${errorMessage}`);
                    setManualLat(null);
                    setManualLng(null);
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        } else {
            setMessage('Geolocation is not supported by your browser.');
        }
    };

    const handleSubmitReport = async (e) => {
        e.preventDefault();
        if (!db || !userId) {
            setMessage('Error: Firebase not initialized or user not logged in.');
            return;
        }

        setIsSubmitting(true);
        setMessage('');

        let latitudeToSave = manualLat;
        let longitudeToSave = manualLng;
        let locationToSave = location;

        if (manualLat === null || manualLng === null) {
            // If current location not used or failed, try geocoding the manual input
            if (!location) {
                setMessage('Please enter a location or use your current location.');
                setIsSubmitting(false);
                return;
            }
            const geoResult = await getCoordinatesFromLocation(location);
            if (geoResult.latitude === null || geoResult.longitude === null) {
                let errorText = 'Could not determine coordinates for the provided location.';
                if (geoResult.status === 'ZERO_RESULTS') {
                    errorText += ' Try being more general (e.g., "Secunderabad" instead of a specific building name) or check for typos.';
                } else if (geoResult.status === 'OVER_QUERY_LIMIT') {
                    errorText += ' API query limit exceeded. Please try again later or check your Google Maps API key settings.';
                } else if (geoResult.status === 'REQUEST_DENIED') {
                    errorText += ' Geocoding API access denied. Check your API key and project settings.';
                }
                setMessage(`Error: ${errorText}`);
                setIsSubmitting(false);
                return;
            }
            latitudeToSave = geoResult.latitude;
            longitudeToSave = geoResult.longitude;
        }

        try {
            const reportsCollectionRef = collection(db, `artifacts/${appId}/public/data/reports`);
            await addDoc(reportsCollectionRef, {
                userId: userId, // The user who made the report
                reportType,
                details,
                location: locationToSave,
                latitude: latitudeToSave,
                longitude: longitudeToSave,
                timestamp: new Date(),
                status: 'pending', // Initial status
            });
            setMessage('Report submitted successfully! Thank you.');
            setDetails('');
            setLocation('');
            setManualLat(null);
            setManualLng(null);
        } catch (error) {
            console.error("Error adding report:", error);
            setMessage(`Failed to submit report: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card title="Report System: Missing Persons, Injuries, Damage">
            <p className="text-gray-600 mb-6">
                Use this form to report critical incidents like missing persons, injuries, or damage.
            </p>
            <form onSubmit={handleSubmitReport} className="space-y-4">
                <div>
                    <label htmlFor="reportType" className="block text-sm font-medium text-gray-700 mb-1">
                        Report Type:
                    </label>
                    <select
                        id="reportType"
                        value={reportType}
                        onChange={(e) => setReportType(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="missing">Missing Person</option>
                        <option value="injury">Injury / Medical Need</option>
                        <option value="damage">Property Damage</option>
                        <option value="other">Other Incident</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="details" className="block text-sm font-medium text-gray-700 mb-1">
                        Details:
                    </label>
                    <textarea
                        id="details"
                        rows="4"
                        value={details}
                        onChange={(e) => setDetails(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        placeholder="Please provide specific details (e.g., 'Child, 5, red shirt, last seen near main square', 'Elderly male, leg injury, needs first aid', 'House collapsed near riverbank')."
                        required
                    ></textarea>
                </div>
                <div>
                    <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                        Location (e.g., address, landmark, "Your Current Location"):
                    </label>
                    <input
                        type="text"
                        id="location"
                        value={location}
                        onChange={(e) => {
                            setLocation(e.target.value);
                            setManualLat(null); // Clear auto-detected location if user starts typing
                            setManualLng(null);
                        }}
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., 123 Main St, Near Town Hall, or use button below"
                        required
                    />
                     <button
                        type="button"
                        onClick={handleUseCurrentLocation}
                        className="mt-2 w-full sm:w-auto bg-gray-200 text-gray-800 py-2 px-4 rounded-md hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-gray-400 focus:ring-offset-2 transition duration-200"
                    >
                        Use Current Location
                    </button>
                    {manualLat !== null && manualLng !== null && (
                        <p className="text-sm text-green-700 mt-2">
                            Detected: Lat {manualLat}, Lng {manualLng}
                        </p>
                    )}
                </div>
                <button
                    type="submit"
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? 'Submitting...' : 'Submit Report'}
                </button>
                {message && (
                    <div className={`mt-4 p-3 rounded-md text-sm ${message.includes('successfully') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {message}
                    </div>
                )}
            </form>
            <div className="mt-8">
                <h3 className="text-lg font-semibold text-gray-700 mb-3">Your Past Reports:</h3>
                <UserReports userId={userId} appId={appId} db={db} />
            </div>
        </Card>
    );
};

const UserReports = ({ userId, appId, db }) => {
    const [reports, setReports] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterType, setFilterType] = useState('all');

    useEffect(() => {
        if (!db || !userId) {
            setLoading(false);
            return;
        }

        const reportsCollectionRef = collection(db, `artifacts/${appId}/public/data/reports`);
        const q = query(reportsCollectionRef, where("userId", "==", userId));

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedReports = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setReports(fetchedReports);
            setLoading(false);
        }, (err) => {
            console.error("Error fetching user reports:", err);
            setError("Failed to load your reports.");
            setLoading(false);
        });

        return () => unsubscribe(); // Cleanup listener
    }, [db, userId, appId]);

    const filteredReports = reports.filter(report => {
        const matchesSearch = searchTerm === '' ||
            report.details.toLowerCase().includes(searchTerm.toLowerCase()) ||
            report.location.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesType = filterType === 'all' || report.reportType === filterType;
        return matchesSearch && matchesType;
    });

    if (loading) {
        return <p className="text-gray-500">Loading your reports...</p>;
    }

    if (error) {
        return <p className="text-red-600">{error}</p>;
    }

    return (
        <div>
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <input
                    type="text"
                    placeholder="Search reports..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-grow p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
                <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                    <option value="all">All Types</option>
                    <option value="missing">Missing Person</option>
                    <option value="injury">Injury / Medical Need</option>
                    <option value="damage">Property Damage</option>
                    <option value="other">Other Incident</option>
                </select>
            </div>
            {filteredReports.length === 0 ? (
                <p className="text-gray-500">No reports found matching your criteria.</p>
            ) : (
                <ul className="space-y-3">
                    {filteredReports.map((report) => (
                        <li key={report.id} className="p-4 bg-gray-50 rounded-lg shadow-sm border border-gray-200">
                            <p className="text-sm font-medium text-gray-800">
                                Type: <span className="font-semibold capitalize">{report.reportType}</span>
                            </p>
                            <p className="text-sm text-gray-600">
                                Location: <span className="font-semibold">{report.location}</span>
                            </p>
                            <p className="text-sm text-gray-600 break-words">
                                Details: {report.details}
                            </p>
                            <p className="text-xs text-gray-500 mt-2">
                                Status: <span className={`font-semibold ${report.status === 'pending' ? 'text-yellow-600' : report.status === 'resolved' ? 'text-green-600' : 'text-gray-600'}`}>
                                    {report.status}
                                </span>
                                <span className="ml-4">
                                    Submitted: {report.timestamp?.toDate().toLocaleString() || 'N/A'}
                                </span>
                            </p>
                        </li>
                    ))}
                </ul>
            )}
        </div>
    );
};


const ResourceRequestsPage = () => {
    const { db, userId, appId } = useFirebase();
    const [requestType, setRequestType] = useState('food');
    const [description, setDescription] = useState('');
    const [location, setLocation] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [message, setMessage] = useState('');
    const [requests, setRequests] = useState([]); // State to store all requests
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');
    const [filterType, setFilterType] = useState('all');

    // Fetch all requests
    useEffect(() => {
        if (!db) return;

        const requestsCollectionRef = collection(db, `artifacts/${appId}/public/data/resourceRequests`);
        const unsubscribe = onSnapshot(requestsCollectionRef, (snapshot) => {
            const fetchedRequests = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setRequests(fetchedRequests);
        }, (err) => {
            console.error("Error fetching resource requests:", err);
        });

        return () => unsubscribe(); // Clean up listener
    }, [db, appId]);

    const handleSubmitRequest = async (e) => {
        e.preventDefault();
        if (!db || !userId) {
            setMessage('Error: Firebase not initialized or user not logged in.');
            return;
        }

        setIsSubmitting(true);
        setMessage('');

        let latitudeToSave = null;
        let longitudeToSave = null;

        // Try geocoding the manual input
        if (location) {
            const geoResult = await getCoordinatesFromLocation(location);
            if (geoResult.latitude === null || geoResult.longitude === null) {
                let errorText = 'Could not determine coordinates for the provided location.';
                if (geoResult.status === 'ZERO_RESULTS') {
                    errorText += ' Try being more general (e.g., "Secunderabad" instead of a specific building name) or check for typos.';
                } else if (geoResult.status === 'OVER_QUERY_LIMIT') {
                    errorText += ' API query limit exceeded. Please try again later or check your Google Maps API key settings.';
                } else if (geoResult.status === 'REQUEST_DENIED') {
                    errorText += ' Geocoding API access denied. Check your API key and project settings.';
                }
                setMessage(`Error: ${errorText}`);
                setIsSubmitting(false);
                return;
            }
            latitudeToSave = geoResult.latitude;
            longitudeToSave = geoResult.longitude;
        } else {
            setMessage('Please enter a location for the resource request.');
            setIsSubmitting(false);
            return;
        }


        try {
            const requestsCollectionRef = collection(db, `artifacts/${appId}/public/data/resourceRequests`);
            await addDoc(requestsCollectionRef, {
                userId: userId, // The user making the request
                requestType,
                description,
                location,
                latitude: latitudeToSave,
                longitude: longitudeToSave,
                timestamp: new Date(),
                status: 'pending', // Initial status
            });
            setMessage('Resource request submitted successfully!');
            setDescription('');
            setLocation('');
        } catch (error) {
            console.error("Error adding resource request:", error);
            setMessage(`Failed to submit request: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleMarkAsFulfilled = async (requestId) => {
        if (!db) return;
        try {
            const requestDocRef = doc(db, `artifacts/${appId}/public/data/resourceRequests`, requestId);
            await updateDoc(requestDocRef, {
                status: 'fulfilled',
                fulfilledBy: userId,
                fulfilledAt: new Date()
            });
            setMessage('Request marked as fulfilled.');
        } catch (error) {
            console.error("Error updating request status:", error);
            setMessage(`Failed to mark as fulfilled: ${error.message}`);
        }
    };

    const filteredRequests = requests.filter(req => {
        const matchesSearch = searchTerm === '' ||
            req.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            req.location.toLowerCase().includes(searchTerm.toLowerCase());
        const matchesStatus = filterStatus === 'all' || req.status === filterStatus;
        const matchesType = filterType === 'all' || req.requestType === filterType;
        return matchesSearch && matchesStatus && matchesType;
    });

    return (
        <Card title="Resource Requests: Post Needs & Live Status">
            <p className="text-gray-600 mb-6">
                Post your immediate needs for food, shelter, medical supplies, and more.
            </p>
            <form onSubmit={handleSubmitRequest} className="space-y-4 mb-8">
                <div>
                    <label htmlFor="requestType" className="block text-sm font-medium text-gray-700 mb-1">
                        Request Type:
                    </label>
                    <select
                        id="requestType"
                        value={requestType}
                        onChange={(e) => setRequestType(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                    >
                        <option value="food">Food</option>
                        <option value="water">Water</option>
                        <option value="shelter">Shelter</option>
                        <option value="medical">Medical Supplies</option>
                        <option value="clothing">Clothing</option>
                        <option value="other">Other</option>
                    </select>
                </div>
                <div>
                    <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                        Description:
                    </label>
                    <textarea
                        id="description"
                        rows="3"
                        value={description}
                        onChange={(e) => setDescription(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., 'Need formula for infant', 'Blankets for 3 people', 'Basic first aid kit'."
                        required
                    ></textarea>
                </div>
                <div>
                    <label htmlFor="location" className="block text-sm font-medium text-gray-700 mb-1">
                        Location (where aid is needed):
                    </label>
                    <input
                        type="text"
                        id="location"
                        value={location}
                        onChange={(e) => setLocation(e.target.value)}
                        className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                        placeholder="e.g., 456 Oak Ave, School Gymnasium"
                        required
                    />
                </div>
                <button
                    type="submit"
                    className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                    disabled={isSubmitting}
                >
                    {isSubmitting ? 'Submitting...' : 'Submit Request'}
                </button>
                {message && (
                    <div className={`mt-4 p-3 rounded-md text-sm ${message.includes('successfully') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                        {message}
                    </div>
                )}
            </form>

            <h3 className="text-lg font-semibold text-gray-700 mb-3">All Requests:</h3>
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <input
                    type="text"
                    placeholder="Search requests..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-grow p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="fulfilled">Fulfilled</option>
                </select>
                <select
                    value={filterType}
                    onChange={(e) => setFilterType(e.target.value)}
                    className="p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                    <option value="all">All Types</option>
                    <option value="food">Food</option>
                    <option value="water">Water</option>
                    <option value="shelter">Shelter</option>
                    <option value="medical">Medical Supplies</option>
                    <option value="clothing">Clothing</option>
                    <option value="other">Other</option>
                </select>
            </div>

            {filteredRequests.length === 0 ? (
                <p className="text-gray-500">No resource requests found matching your criteria.</p>
            ) : (
                <ul className="space-y-4">
                    {filteredRequests.map((request) => (
                        <li key={request.id} className={`p-4 rounded-lg shadow-sm border ${request.status === 'pending' ? 'bg-blue-50 border-blue-200' : 'bg-green-50 border-green-200 opacity-80'}`}>
                            <p className="text-sm font-medium text-blue-800">
                                <span className="font-bold capitalize">{request.requestType}</span> needed at
                                <span className="font-bold ml-1">{request.location}</span>
                            </p>
                            <p className="text-sm text-gray-700 break-words mt-1">
                                Description: {request.description}
                            </p>
                            <p className="text-xs text-gray-500 mt-2">
                                Requested by User ID: <span className="font-mono">{request.userId}</span>
                                <span className="ml-4">
                                    Status: <span className={`font-semibold ${request.status === 'pending' ? 'text-yellow-600' : 'text-green-600'}`}>
                                        {request.status}
                                    </span>
                                </span>
                                <span className="ml-4">
                                    Time: {request.timestamp?.toDate().toLocaleString() || 'N/A'}
                                </span>
                            </p>
                            {request.userId !== userId && request.status === 'pending' && (
                                <button
                                    onClick={() => handleMarkAsFulfilled(request.id)}
                                    className="mt-3 px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition duration-200"
                                >
                                    Mark as Fulfilled
                                </button>
                            )}
                            {request.userId === userId && request.status === 'pending' && (
                                <p className="mt-3 text-sm text-gray-600">
                                    <span className="font-medium text-yellow-700">Awaiting Fulfillment:</span> This is your request.
                                </p>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </Card>
    );
};

const RealTimeUpdatesPage = () => {
    const { db, userId, appId, userRole } = useFirebase();
    const [title, setTitle] = useState('');
    const [message, setMessage] = useState('');
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [feedbackMessage, setFeedbackMessage] = useState('');
    const [broadcasts, setBroadcasts] = useState([]);

    useEffect(() => {
        if (!db) return;
        const broadcastsCollectionRef = collection(db, `artifacts/${appId}/public/data/broadcasts`);
        // Order by timestamp to show latest first
        const q = query(broadcastsCollectionRef);

        const unsubscribe = onSnapshot(q, (snapshot) => {
            const fetchedBroadcasts = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })).sort((a, b) => b.timestamp - a.timestamp); // Sort client-side for simplicity
            setBroadcasts(fetchedBroadcasts);
        }, (err) => {
            console.error("Error fetching broadcasts:", err);
        });
        return () => unsubscribe();
    }, [db, appId]);

    const handleSubmitBroadcast = async (e) => {
        e.preventDefault();
        if (!db || !userId) {
            setFeedbackMessage('Error: Firebase not initialized or user not logged in.');
            return;
        }
        // Basic role check for UI (actual security needs Firebase Security Rules)
        if (userRole !== 'admin' && userRole !== 'ngo') {
            setFeedbackMessage('Error: Only Admins and NGOs can send broadcasts.');
            return;
        }

        setIsSubmitting(true);
        setFeedbackMessage('');

        try {
            const broadcastsCollectionRef = collection(db, `artifacts/${appId}/public/data/broadcasts`);
            await addDoc(broadcastsCollectionRef, {
                userId: userId,
                userRole: userRole,
                title,
                message,
                timestamp: new Date(),
            });
            setFeedbackMessage('Broadcast sent successfully!');
            setTitle('');
            setMessage('');
        } catch (error) {
            console.error("Error sending broadcast:", error);
            setFeedbackMessage(`Failed to send broadcast: ${error.message}`);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card title="Real-Time Updates & Broadcast System">
            <p className="text-gray-600 mb-6">
                Receive critical updates and, if you're an authorized user (Admin/NGO), broadcast important information to all ReliefNet users.
            </p>

            {(userRole === 'admin' || userRole === 'ngo') ? (
                <>
                    <h3 className="text-lg font-semibold text-gray-700 mb-3">Send New Broadcast:</h3>
                    <form onSubmit={handleSubmitBroadcast} className="space-y-4 mb-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div>
                            <label htmlFor="broadcastTitle" className="block text-sm font-medium text-gray-700 mb-1">
                                Title:
                            </label>
                            <input
                                type="text"
                                id="broadcastTitle"
                                value={title}
                                onChange={(e) => setTitle(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                placeholder="e.g., 'Emergency Shelter Open', 'Water Distribution Update'"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="broadcastMessage" className="block text-sm font-medium text-gray-700 mb-1">
                                Message:
                            </label>
                            <textarea
                                id="broadcastMessage"
                                rows="3"
                                value={message}
                                onChange={(e) => setMessage(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Details of the update..."
                                required
                            ></textarea>
                        </div>
                        <button
                            type="submit"
                            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isSubmitting}
                        >
                            {isSubmitting ? 'Sending...' : 'Send Broadcast'}
                        </button>
                        {feedbackMessage && (
                            <div className={`mt-4 p-3 rounded-md text-sm ${feedbackMessage.includes('successfully') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {feedbackMessage}
                            </div>
                        )}
                    </form>
                </>
            ) : (
                <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200 text-yellow-800 text-sm">
                    You need to be an <span className="font-semibold">Admin</span> or <span className="font-semibold">NGO</span> to send broadcasts. Change your role in the header to try this feature.
                </div>
            )}

            <h3 className="text-lg font-semibold text-gray-700 mb-3">All Broadcasts:</h3>
            {broadcasts.length === 0 ? (
                <p className="text-gray-500">No broadcasts have been sent yet.</p>
            ) : (
                <ul className="space-y-4">
                    {broadcasts.map((broadcast) => (
                        <li key={broadcast.id} className="p-4 bg-gray-50 rounded-lg shadow-sm border border-gray-200">
                            <p className="text-base font-semibold text-gray-800">{broadcast.title}</p>
                            <p className="text-sm text-gray-700 mt-1 break-words">{broadcast.message}</p>
                            <p className="text-xs text-gray-500 mt-2">
                                Sent by <span className="font-medium capitalize">{broadcast.userRole}</span> (User ID: <span className="font-mono">{broadcast.userId}</span>)
                                <span className="ml-4">
                                    Time: {broadcast.timestamp?.toDate().toLocaleString() || 'N/A'}
                                </span>
                            </p>
                        </li>
                    ))}
                </ul>
            )}
        </Card>
    );
};


const VolunteerCoordinationPage = () => {
    const { db, userId, appId, userRole } = useFirebase();
    const [taskTitle, setTaskTitle] = useState('');
    const [taskDescription, setTaskDescription] = useState('');
    const [taskLocation, setTaskLocation] = useState('');
    const [requiredSkills, setRequiredSkills] = useState('');
    const [priority, setPriority] = useState('medium');
    const [isCreatingTask, setIsCreatingTask] = useState(false);
    const [createTaskMessage, setCreateTaskMessage] = useState('');
    const [volunteerTasks, setVolunteerTasks] = useState([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [filterStatus, setFilterStatus] = useState('all');

    // Fetch volunteer tasks
    useEffect(() => {
        if (!db) return;
        const tasksCollectionRef = collection(db, `artifacts/${appId}/public/data/volunteerTasks`);
        const unsubscribe = onSnapshot(tasksCollectionRef, (snapshot) => {
            const fetchedTasks = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            }));
            setVolunteerTasks(fetchedTasks);
        }, (err) => {
            console.error("Error fetching volunteer tasks:", err);
        });
        return () => unsubscribe();
    }, [db, appId]);

    const handleCreateTask = async (e) => {
        e.preventDefault();
        if (!db || !userId) {
            setCreateTaskMessage('Error: Firebase not initialized or user not logged in.');
            return;
        }
        if (userRole !== 'admin' && userRole !== 'ngo') {
            setCreateTaskMessage('Error: Only Admins and NGOs can create tasks.');
            return;
        }

        setIsCreatingTask(true);
        setCreateTaskMessage('');

        let latitudeToSave = null;
        let longitudeToSave = null;

        // Try geocoding the manual input
        if (taskLocation) {
            const geoResult = await getCoordinatesFromLocation(taskLocation);
            if (geoResult.latitude === null || geoResult.longitude === null) {
                let errorText = 'Could not determine coordinates for the provided location.';
                if (geoResult.status === 'ZERO_RESULTS') {
                    errorText += ' Try being more general (e.g., "Secunderabad" instead of a specific building name) or check for typos.';
                } else if (geoResult.status === 'OVER_QUERY_LIMIT') {
                    errorText += ' API query limit exceeded. Please try again later or check your Google Maps API key settings.';
                } else if (geoResult.status === 'REQUEST_DENIED') {
                    errorText += ' Geocoding API access denied. Check your API key and project settings.';
                }
                setCreateTaskMessage(`Error: ${errorText}`);
                setIsCreatingTask(false);
                return;
            }
            latitudeToSave = geoResult.latitude;
            longitudeToSave = geoResult.longitude;
        } else {
            setCreateTaskMessage('Please enter a location for the volunteer task.');
            setIsCreatingTask(false);
            return;
        }

        try {
            const tasksCollectionRef = collection(db, `artifacts/${appId}/public/data/volunteerTasks`);
            await addDoc(tasksCollectionRef, {
                createdBy: userId,
                userRole: userRole,
                title: taskTitle,
                description: taskDescription,
                location: taskLocation,
                latitude: latitudeToSave,
                longitude: longitudeToSave,
                requiredSkills: requiredSkills.split(',').map(s => s.trim()).filter(s => s.length > 0),
                priority,
                status: 'pending', // Initial status
                assignedTo: null,
                assignedAt: null,
                completedAt: null,
                createdAt: new Date(),
            });
            setCreateTaskMessage('Task created successfully!');
            setTaskTitle('');
            setTaskDescription('');
            setTaskLocation('');
            setRequiredSkills('');
            setPriority('medium');
        } catch (error) {
            console.error("Error creating task:", error);
            setCreateTaskMessage(`Failed to create task: ${error.message}`);
        } finally {
            setIsCreatingTask(false);
        }
    };

    const handleAcceptTask = async (taskId) => {
        if (!db || !userId) return;
        if (userRole !== 'volunteer') {
            setCreateTaskMessage('Error: Only volunteers can accept tasks.');
            return;
        }

        try {
            const taskDocRef = doc(db, `artifacts/${appId}/public/data/volunteerTasks`, taskId);
            await updateDoc(taskDocRef, {
                status: 'assigned',
                assignedTo: userId,
                assignedAt: new Date(),
            });
            setCreateTaskMessage('Task accepted successfully!');
        } catch (error) {
            console.error("Error accepting task:", error);
            setCreateTaskMessage(`Failed to accept task: ${error.message}`);
        }
    };

    const handleCompleteTask = async (taskId) => {
        if (!db || !userId) return;
        if (userRole !== 'volunteer' && userRole !== 'admin' && userRole !== 'ngo') {
            setCreateTaskMessage('Error: Only assigned volunteers, Admins, or NGOs can complete tasks.');
            return;
        }

        try {
            const taskDocRef = doc(db, `artifacts/${appId}/public/data/volunteerTasks`, taskId);
            await updateDoc(taskDocRef, {
                status: 'completed',
                completedAt: new Date(),
            });
            setCreateTaskMessage('Task marked as completed!');
        } catch (error) {
            console.error("Error completing task:", error);
            setCreateTaskMessage(`Failed to complete task: ${error.message}`);
        }
    };

    const filteredTasks = volunteerTasks.filter(task => {
        const matchesSearch = searchTerm === '' ||
            task.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
            task.description.toLowerCase().includes(searchTerm.toLowerCase()) ||
            task.location.toLowerCase().includes(searchTerm.toLowerCase()) ||
            (task.requiredSkills && task.requiredSkills.some(skill => skill.toLowerCase().includes(searchTerm.toLowerCase())));
        const matchesStatus = filterStatus === 'all' || task.status === filterStatus;
        return matchesSearch && matchesStatus;
    });


    return (
        <Card title="Volunteer Coordination Hub">
            <p className="text-gray-600 mb-6">
                Manage and respond to volunteer tasks. Admins/NGOs can create tasks, while volunteers can accept and complete them.
            </p>

            {(userRole === 'admin' || userRole === 'ngo') ? (
                <>
                    <h3 className="text-lg font-semibold text-gray-700 mb-3">Create New Volunteer Task:</h3>
                    <form onSubmit={handleCreateTask} className="space-y-4 mb-8 p-4 bg-blue-50 rounded-lg border border-blue-200">
                        <div>
                            <label htmlFor="taskTitle" className="block text-sm font-medium text-gray-700 mb-1">
                                Task Title:
                            </label>
                            <input
                                type="text"
                                id="taskTitle"
                                value={taskTitle}
                                onChange={(e) => setTaskTitle(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                placeholder="e.g., 'Distribute water bottles', 'Medical assistance at camp'"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="taskDescription" className="block text-sm font-medium text-gray-700 mb-1">
                                Description:
                            </label>
                            <textarea
                                id="taskDescription"
                                rows="3"
                                value={taskDescription}
                                onChange={(e) => setTaskDescription(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                placeholder="Detailed description of the task..."
                                required
                            ></textarea>
                        </div>
                        <div>
                            <label htmlFor="taskLocation" className="block text-sm font-medium text-gray-700 mb-1">
                                Location:
                            </label>
                            <input
                                type="text"
                                id="taskLocation"
                                value={taskLocation}
                                onChange={(e) => setTaskLocation(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                placeholder="e.g., Main Shelter, Sector 7, Block B"
                                required
                            />
                        </div>
                        <div>
                            <label htmlFor="requiredSkills" className="block text-sm font-medium text-gray-700 mb-1">
                                Required Skills (comma-separated):
                            </label>
                            <input
                                type="text"
                                id="requiredSkills"
                                value={requiredSkills}
                                onChange={(e) => setRequiredSkills(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                                placeholder="e.g., First Aid, Driving, Translation"
                            />
                        </div>
                        <div>
                            <label htmlFor="priority" className="block text-sm font-medium text-gray-700 mb-1">
                                Priority:
                            </label>
                            <select
                                id="priority"
                                value={priority}
                                onChange={(e) => setPriority(e.target.value)}
                                className="w-full p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                            >
                                <option value="low">Low</option>
                                <option value="medium">Medium</option>
                                <option value="high">High</option>
                                <option value="urgent">Urgent</option>
                            </select>
                        </div>
                        <button
                            type="submit"
                            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
                            disabled={isCreatingTask}
                        >
                            {isCreatingTask ? 'Creating Task...' : 'Create Task'}
                        </button>
                        {createTaskMessage && (
                            <div className={`mt-4 p-3 rounded-md text-sm ${createTaskMessage.includes('successfully') ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                {createTaskMessage}
                            </div>
                        )}
                    </form>
                </>
            ) : (
                <div className="mb-6 p-4 bg-yellow-50 rounded-lg border border-yellow-200 text-yellow-800 text-sm">
                    You need to be an <span className="font-semibold">Admin</span> or <span className="font-semibold">NGO</span> to create volunteer tasks. Change your role in the header to try this feature.
                </div>
            )}

            <h3 className="text-lg font-semibold text-gray-700 mb-3">All Volunteer Tasks:</h3>
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
                <input
                    type="text"
                    placeholder="Search tasks..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="flex-grow p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                />
                <select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    className="p-2 border border-gray-300 rounded-md shadow-sm focus:ring-blue-500 focus:border-blue-500"
                >
                    <option value="all">All Statuses</option>
                    <option value="pending">Pending</option>
                    <option value="assigned">Assigned</option>
                    <option value="completed">Completed</option>
                </select>
            </div>

            {filteredTasks.length === 0 ? (
                <p className="text-gray-500">No volunteer tasks found matching your criteria.</p>
            ) : (
                <ul className="space-y-4">
                    {filteredTasks.map((task) => (
                        <li key={task.id} className={`p-4 rounded-lg shadow-sm border ${task.status === 'pending' ? 'bg-indigo-50 border-indigo-200' : task.status === 'assigned' ? 'bg-purple-50 border-purple-200' : 'bg-green-50 border-green-200 opacity-80'}`}>
                            <p className="text-base font-semibold text-gray-800">{task.title}</p>
                            <p className="text-sm text-gray-700 mt-1 break-words">Description: {task.description}</p>
                            <p className="text-sm text-gray-700 mt-1">Location: <span className="font-semibold">{task.location}</span></p>
                            {task.requiredSkills && task.requiredSkills.length > 0 && (
                                <p className="text-sm text-gray-700 mt-1">Skills: <span className="font-semibold">{task.requiredSkills.join(', ')}</span></p>
                            )}
                            <p className="text-sm text-gray-700 mt-1">Priority: <span className={`font-semibold capitalize ${task.priority === 'urgent' ? 'text-red-600' : task.priority === 'high' ? 'text-orange-600' : 'text-gray-700'}`}>{task.priority}</span></p>
                            <p className="text-xs text-gray-500 mt-2">
                                Status: <span className={`font-semibold capitalize ${task.status === 'pending' ? 'text-yellow-600' : task.status === 'assigned' ? 'text-purple-600' : 'text-green-600'}`}>
                                    {task.status}
                                </span>
                                {task.assignedTo && (
                                    <span className="ml-4">Assigned To: <span className="font-mono">{task.assignedTo}</span></span>
                                )}
                                <span className="ml-4">Created By: <span className="font-mono">{task.createdBy}</span> ({task.userRole})</span>
                                <span className="ml-4">Created At: {task.createdAt?.toDate().toLocaleString() || 'N/A'}</span>
                            </p>

                            {userRole === 'volunteer' && task.status === 'pending' && (
                                <button
                                    onClick={() => handleAcceptTask(task.id)}
                                    className="mt-3 px-4 py-2 bg-purple-600 text-white text-sm rounded-md hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:ring-offset-2 transition duration-200"
                                >
                                    Accept Task
                                </button>
                            )}
                            {(userRole === 'volunteer' && task.status === 'assigned' && task.assignedTo === userId) || (userRole === 'admin' || userRole === 'ngo' && task.status !== 'completed') ? (
                                <button
                                    onClick={() => handleCompleteTask(task.id)}
                                    className="mt-3 ml-2 px-4 py-2 bg-green-600 text-white text-sm rounded-md hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2 transition duration-200"
                                >
                                    Mark as Completed
                                </button>
                            ) : null}
                            {task.status === 'completed' && (
                                <p className="mt-3 text-sm text-green-700 font-semibold">
                                    Task completed!
                                    {task.completedAt && ` on ${task.completedAt.toDate().toLocaleString()}`}
                                </p>
                            )}
                        </li>
                    ))}
                </ul>
            )}
        </Card>
    );
};

export default App;
