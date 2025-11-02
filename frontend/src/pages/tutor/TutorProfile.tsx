import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useDropzone } from "react-dropzone";
import { UpdateTutorProfile, GetTutorProfile } from "@/api/tutorAPI";
import { toast } from "react-toastify";
import { useAppDispatch, useAppSelector } from "@/redux/store";
import Navbar from "@/components/Navbar";
import AvailabilityPicker from "../../components/AvailabilityPicker";
import { TrashIcon } from "@heroicons/react/24/outline";
import { Tutor } from "@/types/TutorType";
import TutorLessonTypeInput from "@/components/TutorLessonTypeInput";
import { LessonTypesBySubject } from "@/types/LessonTypes";
import { setLoading } from "@/redux/loaderSlice";

const ViewTutorProfile = () => {
  const navigate = useNavigate();
  const dispatch = useAppDispatch();
  const { user } = useAppSelector((state) => state.user);
  const daysOfWeek = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];

  const defaultAvailability: DayAvailability = daysOfWeek.reduce((acc, day) => {
    acc[day] = { start: "09:00", end: "17:00", enabled: false };
    return acc;
  }, {} as DayAvailability);

  const defaultProfile = {
    id: "",
    userId: "",
    subject: "",
    firstName: "",
    lastName: "",
    hourlyRate: 0,
    qualifications: [],
    availability: defaultAvailability,
    fileUploads: [],
    description: "",
    profileImageUrl: "",
    lessonType: [],
    status: "",
    email: "",
    stagedProfile: null,
    rejectedReason: "",
  };

  const [profile, setProfile] = useState<Tutor>(defaultProfile);

  useEffect(() => {
    // Fetch tutor profile on load
    const fetchProfile = async () => {
      console.log("called fetchProfile");
      try {
        dispatch(setLoading(true));
        if (!user?.token) {
          toast.error("No token found. Please login again.");
          navigate("/");
          return;
        }

        const res = await GetTutorProfile(user.token, user.id);
        const newProfile: Tutor = {
          id: res.data.id || defaultProfile.id,
          userId: res.data.userId || defaultProfile.userId,
          firstName: res.data.firstName || defaultProfile.firstName,
          lastName: res.data.lastName || defaultProfile.lastName,
          hourlyRate: res.data.hourlyRate || defaultProfile.hourlyRate,
          subject: res.data.subject || defaultProfile.subject,
          qualifications: res.data.qualifications || defaultProfile.qualifications, // files handled separately
          availability: res.data.availability || defaultProfile.availability,
          fileUploads: res.data.fileUploads || defaultProfile.fileUploads, // files handled separately
          description: res.data.description || defaultProfile.description,
          lessonType: res.data.lessonType || defaultProfile.lessonType,
          profileImageUrl: res.data.profileImageUrl || defaultProfile.profileImageUrl,
          status: res.data.status || defaultProfile.status,
          email: res.data.email || defaultProfile.email,
          stagedProfile: null,
          rejectedReason: res.data.rejectedReason || defaultProfile.rejectedReason,
        };
        setProfile(newProfile);
        console.log("Fetched profile:", newProfile);
      } catch (err) {
        console.error("Failed to load profile", err);
      }
      finally {
        dispatch(setLoading(false));
      }
    };
    fetchProfile();
  }, [user]);

  const onDrop = (acceptedFiles: File[]) => {
    setProfile((prev) => {
      // existing files
      const existingFiles = prev.fileUploads;
      const existingMetas = prev.qualifications;

      // filter new files, skip duplicates by name + size
      const newOnes = acceptedFiles.filter(
        (file) =>
          !existingFiles.some((f) => f.name === file.name && f.size === file.size) &&
          !existingMetas.some((f) => f.name === file.name) // metadata only has name
      );

      return {
        ...prev,
        fileUploads: [...existingFiles, ...newOnes],
      };
    });
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: {
      "application/pdf": [".pdf"],
      "image/*": [".png", ".jpg", ".jpeg"],
    },
  });

  const handleDelete = (fileToDelete: File) => {
    console.log(fileToDelete);
    setProfile((prev) => ({
      ...prev,
      fileUploads: prev.fileUploads.filter(
        (f) => !(f.name === fileToDelete.name && f.size === fileToDelete.size)
      ),
    }));
  };

  const handleQualificationDelete = (fileToDelete: QualificationFileType) => {
    console.log(fileToDelete);
    setProfile((prev) => ({
      ...prev,
      qualifications: prev.qualifications.filter(
        (f: QualificationFileType) =>
          !(f.name === fileToDelete.name && f.hash === fileToDelete.hash)
      ),
    }));
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;

    console.log("Name ", name);
    console.log("value ", value);
    setProfile((prev) => ({
      ...prev,
      [name as keyof Tutor]: name === "hourlyRate" ? Number(value) : value,
    }));
  };

  const handleBlur = () => {
    setProfile((prev) => ({
      ...prev,
      hourlyRate: prev.hourlyRate < 0 ? prev.hourlyRate * -1 : Number(prev.hourlyRate.toFixed(2)),
    }));
  };

  const handleSave = async () => {
    if (!profile.availability || !Object.values(profile.availability).some(day => day.enabled)) {
      toast.error("Please set your availability for at least one day.");
      return;
    }
  
    if (!profile.lessonType || profile.lessonType.length === 0) {
      toast.error("Please select at least one lesson type.");
      return;
    }
  
    if (!profile.fileUploads || profile.fileUploads.length === 0) {
      toast.error("Please upload at least one qualification file.");
      return;
    }
    
    confirm("Once submitted, your profile will be sent for re-verification. Are you sure you want to submit changes to your profile?") &&
    dispatch(setLoading(true));
    try {
      if (!user?.token) {
        toast.error("No token found. Please login again.");
        dispatch(setLoading(false));
        navigate("/");
        return;
      }
      console.log(profile);
      const formData = new FormData();
      formData.append("userId", profile.userId);
      formData.append("hourlyRate", profile.hourlyRate.toString());
      formData.append("lessonType", JSON.stringify(profile.lessonType));
      formData.append("description", profile.description);
      formData.append("subject", profile.subject);
      formData.append("availability", JSON.stringify(profile.availability));
      profile.fileUploads.forEach((file) => {
        formData.append(`fileUploads`, file);
      });
      formData.append(`qualifications`, JSON.stringify(profile.qualifications));

      await UpdateTutorProfile(user.token, profile.userId, formData);
      toast.success("Profile updated successfully");
      navigate(-1); // go back after saving
    } catch (err) {
      console.error(err);
      toast.error("Failed to update profile");
    } finally {
      dispatch(setLoading(false));
    }

  };

  const handleCancel = () => {
    navigate(-1); // go back without saving
  };

  return (
    <div>
      <Navbar />
      <div className="min-h-screen bg-gray-100 flex justify-center p-6">
        <div className="bg-white w-[500px] rounded-2xl shadow-lg p-6">
          <h1 className="text-xl font-bold text-primary mb-4">Tutor Profile</h1>

          {/* Form */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium">Name</label>
              <input
                type="text"
                name="name"
                value={user?.name}
                disabled
                className="mt-1 w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary outline-none"
                placeholder="Name"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Subject</label>
              <input
                type="text"
                name="name"
                value={profile?.subject}
                disabled
                className="mt-1 w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary outline-none"
                placeholder="Subject"
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Description</label>
              <textarea
                name="description"
                onChange={(e) =>
                  setProfile((prev) => ({ ...prev, description: e.target.value }))
                }
                value={profile?.description}
                className="mt-1 w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary outline-none resize-none"
                placeholder="Write a short description about yourself"
                rows={4} // sets the initial height
              />
            </div>
            <div>
              <label className="block text-sm font-medium">Availability</label>
              <AvailabilityPicker
                value={profile.availability}
                onChange={(newAvailability) =>
                  setProfile((prev) => ({
                    ...prev,
                    availability: newAvailability,
                  }))
                }
              />
            </div>

            <div>
              <label className="block text-sm font-medium">Hourly Rate ($)</label>
              <input
                type="number"
                name="hourlyRate"
                value={profile.hourlyRate}
                onChange={handleChange}
                onBlur={handleBlur}
                className="mt-1 w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary outline-none"
                placeholder="Enter rate"
                min={0}
                step={0.01}
              />
            </div>
            <TutorLessonTypeInput
              value={profile.lessonType}
              onChange={(newTypes) =>
                setProfile((prev) => ({
                  ...prev,
                  lessonType: newTypes,
                }))
              }
              suggestions={LessonTypesBySubject[profile.subject] || []}
            />

            {/* <div>
            <label className="block text-sm font-medium">Qualifications</label>
            <textarea
              name="qualifications"
              value={profile.qualifications}
              onChange={handleChange}
              rows={3}
              className="mt-1 w-full border rounded-lg px-3 py-2 focus:ring-2 focus:ring-primary outline-none"
              placeholder="E.g. MSc in Physics, 5 years experience"
            />
          </div> */}

            {/* Qualifications Dropzone */}
            <div>
              <label className="block text-sm font-medium mb-1">
                Qualifications (PDF or Images)
              </label>
              <div
                {...getRootProps()}
                className={`border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition ${isDragActive ? "border-primary bg-primary/10" : "border-gray-300"
                  }`}>
                <input {...getInputProps()} />
                {isDragActive ? (
                  <p className="text-primary font-medium">Drop files here...</p>
                ) : (
                  <p className="text-gray-500">Drag & drop files here, or click to select</p>
                )}
              </div>

              {/* Preview of uploaded files */}
              <ul className="mt-2 text-sm text-gray-700">
                {profile.fileUploads.map((file, idx) => (
                  <li key={idx}>
                    <div className="flex justify-between items-center">
                      📄 {file.name}
                      <span>
                        <button
                          type="button"
                          className="p-2 rounded-lg hover:bg-red-100 text-red-500"
                          onClick={() => handleDelete(file)}>
                          <TrashIcon className="h-5 w-5" />
                        </button>
                      </span>
                    </div>
                  </li>
                ))}
                {profile.qualifications.map((file, idx) =>
                  !file.deleted ? (
                    <li key={idx}>
                      <div className="flex justify-between items-center">
                        📄 {file.name}
                        <span>
                          <button
                            type="button"
                            className="p-2 rounded-lg hover:bg-red-100 text-red-500"
                            onClick={() => handleQualificationDelete(file)}>
                            <TrashIcon className="h-5 w-5" />
                          </button>
                        </span>
                      </div>
                    </li>
                  ) : (
                    <li></li>
                  )
                )}
              </ul>
            </div>

            <button
              onClick={handleSave}
              className="w-full rounded-lg bg-primary text-white py-2 transition duration-300 hover:bg-primary/90">
              Submit Changes
            </button>
            <button
              onClick={handleCancel}
              className="w-full rounded-lg border border-primary text-primary px-4 py-2 transition duration-300 hover:bg-primary hover:text-white">
              Cancel
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ViewTutorProfile;
