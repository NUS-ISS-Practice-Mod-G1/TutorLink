import Navbar from "@/components/Navbar";
import { useState, useEffect } from "react";
import { SearchTutors } from "@/api/studentAPI";
import { TutorSearchRequest, Tutor } from "@/types/TutorType";
import { useAppSelector } from "@/redux/store";
import { Range } from "react-range";
import { useNavigate } from "react-router-dom";
import defaultProfile from "../../assets/default-profile-pic.jpg";
import tutorImg from "../../assets/tutor.jpg";

const STEP = 1;
const MIN = 0;
const MAX = 100;

const FindTutor = () => {
  const [search, setSearch] = useState("");
  const [subject, setSubject] = useState("");
  const [priceRange, setPriceRange] = useState<[number, number]>([0, 100]);
  const [availability, setAvailability] = useState("");
  const [tutorResults, setTutorResults] = useState<Tutor[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [filtersCleared, setFiltersCleared] = useState(false);

  const { user } = useAppSelector((state) => state.user);
  const navigate = useNavigate();

  // Fetch all tutors on page load
  useEffect(() => {
    handleSearch();
  }, []);

  // Trigger search after clearing filters
  useEffect(() => {
    if (filtersCleared) {
      handleSearch();
      setFiltersCleared(false);
    }
  }, [filtersCleared]);

  const handleSearch = async () => {
    setLoading(true);
    setError(null);

    const token = user?.token;
    if (!token) {
      setError("No auth token found. Please login.");
      setLoading(false);
      return;
    }

    const reqBody: TutorSearchRequest = {
      name: search || undefined,
      subject: subject || undefined,
      minPrice: priceRange[0],
      maxPrice: priceRange[1],
      availability: availability || undefined,
    };

    try {
      const res = await SearchTutors(reqBody, token);
      setTutorResults(res.data);
      console.log("tutor data", res.data);
    } catch (err) {
      console.error("Failed to search tutors:", err);
      setError("Failed to fetch tutors. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleClear = () => {
    setSearch("");
    setSubject("");
    setPriceRange([0, 100]);
    setAvailability("");
    setFiltersCleared(true);
  };

  return (
    <div>
      <Navbar />
      <div className="min-h-screen bg-[#f2f2f2]">
        {/* Header */}
        <div className="bg-white rounded-lg shadow-md p-12 flex flex-col md:flex-row items-center gap-6 min-h-[300px]">
          <div className="w-full md:w-3/5 flex flex-col justify-center">
            <h1 className="text-3xl md:text-4xl font-bold text-gray-800 mb-4">
              Find your tutor now
            </h1>
            <p className="text-gray-600 text-base md:text-lg">
              Browse our selection of qualified tutors and find the perfect match for your learning
              style.
            </p>
          </div>
          <div className="w-full md:w-2/5 flex justify-center items-center">
            <img
              src={tutorImg}
              alt="Tutor illustration"
              className="rounded-lg object-cover w-full h-full max-h-[300px]"
            />
          </div>
        </div>

        <div className="mx-auto p-6">
          {/* Search & Filters */}
          <div className="bg-white rounded-lg shadow-md p-6 mb-6">
            <h2 className="text-xl font-bold mb-4">Find a Tutor</h2>

            <div className="flex flex-wrap gap-4">
              {/* Name */}
              <div className="flex-1 min-w-[150px]">
                <input
                  type="text"
                  placeholder="Search by tutor name or keyword"
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="w-full border rounded-md px-3 py-2 focus:outline-none focus:ring-2 focus:ring-primary"
                />
              </div>

              {/* Subject */}
              <div className="flex-1 min-w-[150px]">
                <select
                  value={subject}
                  onChange={(e) => setSubject(e.target.value)}
                  className="w-full border rounded-md px-3 py-2">
                  <option value="">All Subjects</option>
                  <option value="Math">Math</option>
                  <option value="Science">Science</option>
                  <option value="English">English</option>
                  <option value="History">History</option>
                </select>
              </div>

              {/* Availability */}
              <div className="flex-1 min-w-[150px]">
                <select
                  value={availability}
                  onChange={(e) => setAvailability(e.target.value)}
                  className="w-full border rounded-md px-3 py-2">
                  <option value="">Any Day</option>
                  <option value="MONDAY">Monday</option>
                  <option value="TUESDAY">Tuesday</option>
                  <option value="WEDNESDAY">Wednesday</option>
                  <option value="THURSDAY">Thursday</option>
                  <option value="FRIDAY">Friday</option>
                  <option value="SATURDAY">Saturday</option>
                  <option value="SUNDAY">Sunday</option>
                </select>
              </div>

              {/* Price Range Slider */}
              <div className="flex-1 min-w-[150px]">
                <label className="text-sm font-medium mb-2 block">
                  Price Range: ${priceRange[0]} - ${priceRange[1]}
                </label>
                <Range
                  step={STEP}
                  min={MIN}
                  max={MAX}
                  values={priceRange}
                  onChange={(values) => setPriceRange(values as [number, number])}
                  renderTrack={({ props, children }) => (
                    <div
                      {...props}
                      style={{
                        ...props.style,
                        height: "6px",
                        background: "#ccc",
                        width: "100%",
                        borderRadius: "3px",
                      }}>
                      {children}
                    </div>
                  )}
                  renderThumb={({ props }) => (
                    <div
                      {...props}
                      style={{
                        ...props.style,
                        height: "20px",
                        width: "20px",
                        backgroundColor: "#1a61a3",
                        borderRadius: "50%",
                      }}
                    />
                  )}
                />
              </div>
            </div>

            <div className="mt-4 flex flex-col md:flex-row items-center gap-4">
              <button
                onClick={handleSearch}
                disabled={loading}
                className="bg-primary text-white px-6 py-2 rounded-md hover:bg-primary/80 transition disabled:opacity-50">
                {loading ? "Searching..." : "Search"}
              </button>
              <button
                onClick={handleClear}
                disabled={loading}
                className="bg-gray-300 text-gray-800 px-6 py-2 rounded-md hover:bg-gray-400 transition disabled:opacity-50">
                Clear Filters
              </button>
            </div>

            {error && <p className="text-red-500 mt-2">{error}</p>}
          </div>

          {/* Tutor Results */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {tutorResults.length === 0 && !loading && (
              <p className="col-span-3 text-center text-gray-500">No tutors found</p>
            )}

            {tutorResults.map((tutor) => (
              <div
                key={tutor.id?.toString()}
                className="bg-white rounded-lg shadow-md p-5 flex flex-col h-full">
                {/* top area: 30% image, 70% details */}
                <div className="flex flex-col md:flex-row gap-4 items-start">
                  {/* Image (30%) */}
                  <div className="flex-shrink-0 md:w-1/3 flex justify-center md:justify-start">
                    <img
                      src={tutor.profileImageUrl || defaultProfile}
                      alt={`${tutor.firstName} ${tutor.lastName}`}
                      className="w-24 h-24 rounded-full object-cover border shadow"
                    />
                  </div>

                  {/* Details (70%) */}
                  <div className="flex-1 md:w-2/3 flex flex-col">
                    <div className="flex justify-between items-start gap-4">
                      <div>
                        <h3 className="text-xl font-semibold">
                          {tutor.firstName} {tutor.lastName}
                        </h3>
                        <p className="text-md text-gray-600 mt-1">Teaches: {tutor.subject}</p>

                        <p className="text-sm text-gray-600 mt-2">
                          Available:&nbsp;
                          {tutor.availability &&
                            Object.entries(tutor.availability)
                              .filter(([_, value]: any) => value.enabled)
                              .map(([day, value]: any) => {
                                const dayName =
                                  day.charAt(0).toUpperCase() + day.slice(1).toLowerCase();
                                return `${dayName} (${value.start} - ${value.end})`;
                              })
                              .join(", ")}
                        </p>
                      </div>
                    </div>
                  </div>
                </div>

                {/* bottom: rate + action */}
                <div className="mt-4 flex items-center justify-between">
                  <span className="text-xl font-bold text-primary">SGD {tutor.hourlyRate}/hr</span>
                  <button
                    onClick={() => navigate(`/student/view-tutor/${tutor.id?.toString()}`)}
                    className="bg-primary text-white px-4 py-2 rounded-md hover:bg-primary/80 transition">
                    View Profile
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default FindTutor;
