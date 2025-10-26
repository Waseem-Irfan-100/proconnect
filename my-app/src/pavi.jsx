import React, { useState, useEffect, useRef } from 'react';
import { initializeApp } from 'firebase/app';
import { getAuth, signInAnonymously, onAuthStateChanged, signInWithCustomToken } from 'firebase/auth';
import { getFirestore, collection, doc, setDoc, addDoc, onSnapshot, query, serverTimestamp, orderBy, getDoc, updateDoc } from 'firebase/firestore';

// --- SVG ICONS ---
const HomeIcon = ({ className = "w-6 h-6" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M11.47 3.84a.75.75 0 011.06 0l8.69 8.69a.75.75 0 101.06-1.06l-8.69-8.69a2.25 2.25 0 00-3.18 0l-8.69 8.69a.75.75 0 001.06 1.06l8.69-8.69z" />
    <path d="M12 5.432l8.159 8.159c.026.026.05.054.07.084v6.101a2.25 2.25 0 01-2.25 2.25H16.5a.75.75 0 01-.75-.75v-2.5a.75.75 0 00-.75-.75h-3a.75.75 0 00-.75.75v2.5a.75.75 0 01-.75-.75H5.25a2.25 2.25 0 01-2.25-2.25v-6.101c.02-.03.044-.058.07-.084L12 5.432z" />
  </svg>
);

const UsersIcon = ({ className = "w-6 h-6" }) => (
  <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
    <path d="M4.5 6.375a4.125 4.125 0 118.25 0 4.125 4.125 0 01-8.25 0zM14.25 8.625a3.375 3.375 0 116.75 0 3.375 3.375 0 01-6.75 0zM5.25 9.375c-1.508 0-2.87.81-3.596 2.026a.75.75 0 00.748 1.052A4.453 4.453 0 018.25 12a4.453 4.453 0 013.848.553.75.75 0 00.748-1.052A4.125 4.125 0 005.25 9.375zM14.25 11.625c-1.508 0-2.87.81-3.596 2.026a.75.75 0 00.748 1.052 4.453 4.453 0 018.598 0 .75.75 0 00.748-1.052 4.125 4.125 0 00-3.596-2.026z" />
  </svg>
);

const BriefcaseIcon = ({ className = "w-6 h-6" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M7.5 5.25A2.25 2.25 0 019.75 3h4.5A2.25 2.25 0 0116.5 5.25v1.5h-9v-1.5z" clipRule="evenodd" />
        <path fillRule="evenodd" d="M6 8.25A2.25 2.25 0 018.25 6h7.5A2.25 2.25 0 0118 8.25v9a2.25 2.25 0 01-2.25 2.25h-7.5A2.25 2.25 0 016 17.25v-9zm1.5 1.5v7.5h7.5v-7.5h-7.5z" clipRule="evenodd" />
    </svg>
);

const ChatBubbleLeftRightIcon = ({ className = "w-6 h-6" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M1.5 3.375c0-1.036.84-1.875 1.875-1.875h13.5c1.036 0 1.875.84 1.875 1.875v9.75c0 1.036-.84 1.875-1.875 1.875h-4.332l-3.21 3.21a.75.75 0 01-1.06 0l-3.21-3.21H3.375A1.875 1.875 0 011.5 13.125v-9.75zm15.156 12.453l1.341 1.342a.75.75 0 01-1.06 1.06l-1.52-1.521a.75.75 0 01-.219-.53v-1.026c.495.27.93.593 1.292.951z" clipRule="evenodd" />
        <path d="M22.5 8.625c0-1.036-.84-1.875-1.875-1.875h-13.5c-.478 0-.93.184-1.26.513a.75.75 0 01-1.06-1.06A3.376 3.376 0 017.125 4.5h13.5c1.035 0 1.875.84 1.875 1.875v9.75c0 1.036-.84 1.875-1.875 1.875h-1.5a.75.75 0 010-1.5h1.5a.375.375 0 00.375-.375v-9.75z" />
    </svg>
);

const BellIcon = ({ className = "w-6 h-6" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M11.54 2.31a.75.75 0 01.92 0l6.75 6.75a.75.75 0 01-.53 1.28H4.81a.75.75 0 01-.53-1.28l6.75-6.75zM11.25 12a.75.75 0 01.75-.75h.008a.75.75 0 01.75.75v5.25a.75.75 0 01-1.5 0v-5.25z" clipRule="evenodd" />
        <path d="M3 14.25a.75.75 0 01.75-.75h16.5a.75.75 0 010 1.5H3.75a.75.75 0 01-.75-.75z" />
    </svg>
);

const PhotoIcon = ({ className = "w-6 h-6" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}><path fillRule="evenodd" d="M1.5 6a2.25 2.25 0 012.25-2.25h16.5A2.25 2.25 0 0122.5 6v12A2.25 2.25 0 0120.25 20.25H3.75A2.25 2.25 0 011.5 18V6zM3 16.06V18c0 .414.336.75.75.75h16.5A.75.75 0 0021 18v-1.94l-2.69-2.689a1.5 1.5 0 00-2.12 0l-.88.879.97.97a.75.75 0 11-1.06 1.06l-5.16-5.159a1.5 1.5 0 00-2.12 0L3 16.061zm10.125-7.81a1.125 1.125 0 112.25 0 1.125 1.125 0 01-2.25 0z" clipRule="evenodd" /></svg>
);

const VideoCameraIcon = ({ className = "w-6 h-6" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}><path d="M4.5 4.5a3 3 0 00-3 3v9a3 3 0 003 3h8.25a3 3 0 003-3v-2.25l3.44 3.442a.75.75 0 001.28-.53V6.34a.75.75 0 00-1.28-.53L15.75 9.25V7.5a3 3 0 00-3-3H4.5z" /></svg>
);

const CalendarIcon = ({ className = "w-6 h-6" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}><path fillRule="evenodd" d="M6.75 2.25A.75.75 0 017.5 3v1.5h9V3A.75.75 0 0118 3v1.5h.75a3 3 0 013 3v11.25a3 3 0 01-3 3H5.25a3 3 0 01-3-3V7.5a3 3 0 013-3H6v-1.5A.75.75 0 016.75 2.25zM5.25 6.375c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h13.5c.621 0 1.125-.504 1.125-1.125V7.5c0-.621-.504-1.125-1.125-1.125H5.25z" clipRule="evenodd" /><path d="M10.5 12a.75.75 0 01.75-.75h2.25a.75.75 0 01.75.75v.008a.75.75 0 01-.75.75h-2.25a.75.75 0 01-.75-.75v-.008zM10.5 15a.75.75 0 01.75-.75h2.25a.75.75 0 01.75.75v.008a.75.75 0 01-.75.75h-2.25a.75.75 0 01-.75-.75v-.008z" /></svg>
);

const UserCircleIcon = ({ className }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}>
        <path fillRule="evenodd" d="M18.685 19.097A9.723 9.723 0 0021.75 12c0-5.385-4.365-9.75-9.75-9.75S2.25 6.615 2.25 12a9.723 9.723 0 003.065 7.097A9.716 9.716 0 0012 21.75a9.716 9.716 0 006.685-2.653zm-12.54-1.285A7.486 7.486 0 0112 15a7.486 7.486 0 017.855 2.812A8.224 8.224 0 0112 20.25a8.224 8.224 0 01-5.855-2.438zM15.75 9a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0z" clipRule="evenodd" />
    </svg>
);

const PencilIcon = ({ className = "w-5 h-5" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className={className}><path d="M21.731 2.269a2.625 2.625 0 00-3.712 0l-1.157 1.157 3.712 3.712 1.157-1.157a2.625 2.625 0 000-3.712zM19.513 8.199l-3.712-3.712-12.15 12.15a.75.75 0 00-.22 1.06l1.528 1.528a.75.75 0 001.06.22l12.15-12.15z" /><path d="M5.604 21.146a.75.75 0 01-.22-1.06l1.528-1.528 3.712 3.712-1.528 1.528a.75.75 0 01-1.06-.22z" /></svg>
);

const XMarkIcon = ({ className="w-6 h-6" }) => (
    <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor" className={className}>
        <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
    </svg>
);


// --- FIREBASE CONFIGURATION ---
const firebaseConfig = typeof _firebase_config !== 'undefined' ? JSON.parse(_firebase_config) : {
    apiKey: "YOUR_API_KEY",
    authDomain: "YOUR_AUTH_DOMAIN",
    projectId: "YOUR_PROJECT_ID",
    storageBucket: "YOUR_STORAGE_BUCKET",
    messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
    appId: "YOUR_APP_ID"
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);
const appId = typeof __app_id !== 'undefined' ? __app_id : 'default-proconnect-app';


// --- REACT COMPONENTS ---

const Header = ({ user, onViewProfile, onGoHome }) => {
    return (
        <header className="sticky top-0 z-30 bg-white border-b border-gray-200 shadow-sm">
            <div className="container mx-auto px-4 sm:px-6 lg:px-8">
                <div className="flex items-center justify-between h-16">
                    <div className="flex items-center space-x-4">
                        <button onClick={onGoHome} className="flex-shrink-0">
                             <svg className="h-8 w-auto text-blue-600" viewBox="0 0 24 24" fill="currentColor">
                                <path d="M2.129 2.129a2.25 2.25 0 00-2.129 2.129v15.484a2.25 2.25 0 002.25 2.25h15.484a2.25 2.25 0 002.129-2.129V4.258a2.25 2.25 0 00-2.129-2.129H2.129zM12 2.25a.75.75 0 00-.75.75v18a.75.75 0 001.5 0V3a.75.75 0 00-.75-.75z" />
                                <path d="M8.625 7.5a.75.75 0 00-1.5 0v3.375a.75.75 0 001.5 0V7.5zM12 7.5a.75.75 0 00-1.5 0v4.5a.75.75 0 001.5 0v-4.5zM15.375 7.5a.75.75 0 00-1.5 0v7.5a.75.75 0 001.5 0V7.5z" />
                            </svg>
                        </button>
                        <div className="relative hidden sm:block">
                            <input
                                type="text"
                                placeholder="Search"
                                className="w-48 lg:w-72 bg-gray-100 border border-transparent rounded-md py-2 pl-4 pr-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:bg-white"
                            />
                        </div>
                    </div>

                    <nav className="hidden md:flex items-center space-x-1 lg:space-x-4">
                        <NavItem Icon={HomeIcon} text="Home" active onClick={onGoHome} />
                        <NavItem Icon={UsersIcon} text="My Network" />
                        <NavItem Icon={BriefcaseIcon} text="Jobs" />
                        <NavItem Icon={ChatBubbleLeftRightIcon} text="Messaging" />
                        <NavItem Icon={BellIcon} text="Notifications" />
                    </nav>

                    <button onClick={() => onViewProfile(user.uid)} className="flex items-center space-x-4 p-2 rounded-lg transition-colors duration-200 hover:bg-gray-100">
                        <div className="flex-shrink-0">
                           {user?.photoURL ? (
                                <img className="h-8 w-8 rounded-full" src={user.photoURL} alt="User avatar" />
                            ) : (
                                <UserCircleIcon className="h-8 w-8 text-gray-400 bg-gray-200 rounded-full" />
                            )}
                        </div>
                        <div className="hidden sm:block text-left">
                            <div className="text-sm font-medium text-gray-800">{user?.displayName || "Guest User"}</div>
                            <div className="text-xs text-gray-500">Your Title Here</div>
                        </div>
                    </button>
                </div>
            </div>
        </header>
    );
};

const NavItem = ({ Icon, text, active, onClick }) => (
  <button
    onClick={onClick}
    className={`flex flex-col items-center px-2 py-1 space-y-1 text-xs rounded-md transition-all duration-200 ${
      active
        ? 'text-blue-600'
        : 'text-gray-500 hover:text-blue-600 hover:bg-gray-100'
    } transform hover:scale-110`}
  >
    <Icon className="w-5 h-5" />
    <span>{text}</span>
  </button>
);

const Sidebar = ({ user, onViewProfile }) => {
    return (
        <aside className="hidden md:block md:w-60 lg:w-72 sticky top-20 self-start">
            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden transition-all duration-300 ease-in-out hover:shadow-lg">
                <button onClick={() => onViewProfile(user.uid)} className="w-full p-4 flex flex-col items-center text-center border-b transition-colors duration-200 hover:bg-gray-50">
                     {user?.photoURL ? (
                        <img className="h-16 w-16 rounded-full mb-2" src={user.photoURL} alt="User avatar" />
                    ) : (
                        <UserCircleIcon className="h-16 w-16 text-gray-400 bg-gray-200 rounded-full mb-2" />
                    )}
                    <h3 className="font-semibold text-gray-800">{user?.displayName || "Guest User"}</h3>
                    <p className="text-sm text-gray-500">Full Stack Developer | React & Firebase</p>
                </button>
                <div className="p-4 text-sm text-gray-600">
                    <div className="flex justify-between py-2">
                        <span>Profile Views</span>
                        <span className="font-semibold text-blue-600">1,234</span>
                    </div>
                    <div className="flex justify-between py-2">
                        <span>Post Impressions</span>
                        <span className="font-semibold text-blue-600">5,678</span>
                    </div>
                </div>
            </div>
        </aside>
    );
};

const Feed = ({ user, posts, onPost, onViewProfile }) => {
    return (
        <main className="flex-1 min-w-0">
            <div className="space-y-4">
                <CreatePost user={user} onPost={onPost} />
                {posts.map(post => <Post key={post.id} post={post} onViewProfile={onViewProfile} />)}
            </div>
        </main>
    );
};

const CreatePost = ({ user, onPost }) => {
    const [input, setInput] = useState('');

    const handleSubmit = (e) => {
        e.preventDefault();
        if (!input.trim()) return;
        onPost(input);
        setInput('');
    };

    return (
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm">
            <div className="flex items-start space-x-3">
                 <div className="flex-shrink-0">
                   {user?.photoURL ? (
                        <img className="h-10 w-10 rounded-full" src={user.photoURL} alt="User avatar" />
                    ) : (
                        <UserCircleIcon className="h-10 w-10 text-gray-400 bg-gray-200 rounded-full" />
                    )}
                </div>
                <form onSubmit={handleSubmit} className="flex-1">
                    <input
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        className="w-full border border-gray-300 rounded-full py-2 px-4 text-sm placeholder-gray-500 focus:outline-none focus:ring-2 focus:ring-blue-500"
                        placeholder="Start a post"
                    />
                </form>
            </div>
            <div className="flex justify-around items-center mt-3 pt-3 border-t">
                <PostActionButton Icon={PhotoIcon} text="Photo" color="text-blue-500" />
                <PostActionButton Icon={VideoCameraIcon} text="Video" color="text-green-500" />
                <PostActionButton Icon={CalendarIcon} text="Event" color="text-orange-500" />
            </div>
        </div>
    );
};

const PostActionButton = ({ Icon, text, color }) => (
  <button className="flex items-center space-x-2 text-sm font-medium text-gray-600 hover:bg-gray-100 p-2 rounded-md transition-transform">
    <Icon className={`w-6 h-6 ${color}`} />
    <span>{text}</span>
  </button>
);

const Post = ({ post, onViewProfile }) => {
    const { authorName, authorTitle, content, timestamp, authorId, authorPhotoURL } = post;
    const timeAgo = timestamp ? new Date(timestamp.seconds * 1000).toLocaleString() : 'Just now';

    return (
        <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm transition-all duration-300 ease-in-out hover:shadow-xl hover:-translate-y-1">
            <div className="flex items-start space-x-3">
                 <button onClick={() => onViewProfile(authorId)} className="flex-shrink-0">
                   {authorPhotoURL ? (
                        <img className="h-10 w-10 rounded-full" src={authorPhotoURL} alt="Author avatar" />
                    ) : (
                        <UserCircleIcon className="h-10 w-10 text-gray-400 bg-gray-200 rounded-full" />
                    )}
                </button>
                <div className="flex-1">
                    <div className="text-sm">
                        <button onClick={() => onViewProfile(authorId)} className="font-semibold text-gray-800 hover:underline text-left">{authorName}</button>
                        <p className="text-xs text-gray-500">{authorTitle}</p>
                        <p className="text-xs text-gray-500">{timeAgo}</p>
                    </div>
                </div>
            </div>
            <p className="text-sm text-gray-800 my-4">{content}</p>
        </div>
    );
};

const Widgets = () => {
    return (
        <aside className="hidden lg:block lg:w-80 sticky top-20 self-start">
            <div className="bg-white p-4 rounded-lg border border-gray-200 shadow-sm space-y-4 transition-all duration-300 ease-in-out hover:shadow-lg">
                <h4 className="font-semibold text-gray-800">Add to your feed</h4>
                <div className="space-y-3">
                    <FollowSuggestion name="React Developers" description="Community for React enthusiasts." />
                    <FollowSuggestion name="Tailwind CSS" description="Official Tailwind CSS news and updates." />
                    <FollowSuggestion name="Firebase" description="Google's Mobile Platform." />
                </div>
            </div>
        </aside>
    );
};

const FollowSuggestion = ({ name, description }) => (
    <div className="flex items-center space-x-3">
        <div className="h-10 w-10 bg-gray-200 rounded-md flex-shrink-0"></div>
        <div className="flex-1">
            <h5 className="text-sm font-semibold text-gray-800">{name}</h5>
            <p className="text-xs text-gray-500">{description}</p>
        </div>
        <button className="text-sm font-semibold text-blue-600 border border-blue-600 rounded-full px-3 py-1 hover:bg-blue-50 transition-transform duration-200 hover:scale-105">
            + Follow
        </button>
    </div>
);

const EditProfileModal = ({ profile, onSave, onCancel }) => {
    const [formData, setFormData] = useState(profile);
    const [newSkill, setNewSkill] = useState("");

    const handleChange = (e) => {
        const { name, value } = e.target;
        setFormData(prev => ({ ...prev, [name]: value }));
    };

    const handleAddSkill = () => {
        if (newSkill && !formData.skills.includes(newSkill)) {
            setFormData(prev => ({ ...prev, skills: [...prev.skills, newSkill] }));
            setNewSkill("");
        }
    };

    const handleRemoveSkill = (skillToRemove) => {
        setFormData(prev => ({
            ...prev,
            skills: prev.skills.filter(skill => skill !== skillToRemove)
        }));
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        onSave(formData);
    };

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex justify-center items-center">
            <div className="bg-white rounded-lg shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <form onSubmit={handleSubmit} className="p-6">
                    <div className="flex justify-between items-center mb-4">
                        <h2 className="text-xl font-bold text-gray-800">Edit Profile</h2>
                        <button type="button" onClick={onCancel} className="text-gray-500 hover:text-gray-800">
                            <XMarkIcon className="w-6 h-6" />
                        </button>
                    </div>

                    {/* Basic Info */}
                    <div className="space-y-4 mb-6">
                        <div>
                            <label htmlFor="name" className="block text-sm font-medium text-gray-700">Name</label>
                            <input type="text" name="name" id="name" value={formData.name} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                        </div>
                        <div>
                            <label htmlFor="title" className="block text-sm font-medium text-gray-700">Title</label>
                            <input type="text" name="title" id="title" value={formData.title} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm" />
                        </div>
                        <div>
                            <label htmlFor="summary" className="block text-sm font-medium text-gray-700">Summary</label>
                            <textarea name="summary" id="summary" rows="4" value={formData.summary} onChange={handleChange} className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"></textarea>
                        </div>
                    </div>

                    {/* Skills */}
                    <div className="mb-6">
                        <h3 className="text-lg font-medium text-gray-800 mb-2">Skills</h3>
                        <div className="flex items-center gap-2 mb-2">
                            <input 
                                type="text" 
                                value={newSkill}
                                onChange={(e) => setNewSkill(e.target.value)}
                                placeholder="Add a new skill"
                                className="flex-grow border border-gray-300 rounded-md shadow-sm py-2 px-3 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                            />
                            <button type="button" onClick={handleAddSkill} className="bg-blue-500 text-white font-semibold py-2 px-4 rounded-md hover:bg-blue-600">Add</button>
                        </div>
                        <div className="flex flex-wrap gap-2">
                            {formData.skills.map((skill, index) => (
                                <div key={index} className="bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded-full flex items-center gap-1">
                                    {skill}
                                    <button type="button" onClick={() => handleRemoveSkill(skill)} className="text-blue-600 hover:text-blue-800">
                                        <XMarkIcon className="w-3 h-3"/>
                                    </button>
                                </div>
                            ))}
                        </div>
                    </div>

                    <div className="flex justify-end gap-4">
                        <button type="button" onClick={onCancel} className="bg-gray-200 text-gray-800 font-semibold py-2 px-4 rounded-md hover:bg-gray-300">Cancel</button>
                        <button type="submit" className="bg-blue-600 text-white font-semibold py-2 px-4 rounded-md hover:bg-blue-700">Save Changes</button>
                    </div>
                </form>
            </div>
        </div>
    );
};


const ProfilePage = ({ profileData, onGoHome, isOwnProfile, onUpdateProfile }) => {
    const { name, title, summary, experience, education, photoURL, skills } = profileData;
    const [isEditing, setIsEditing] = useState(false);

    const handleSave = async (updatedProfile) => {
        await onUpdateProfile(updatedProfile);
        setIsEditing(false);
    };

    return (
        <main className="flex-1 min-w-0">
            {isEditing && <EditProfileModal profile={profileData} onSave={handleSave} onCancel={() => setIsEditing(false)} />}
            
            <div className="relative">
                 <button onClick={onGoHome} className="mb-4 text-sm font-semibold text-blue-600 hover:underline">
                    &larr; Back to Feed
                </button>

                {isOwnProfile && (
                     <button 
                        onClick={() => setIsEditing(true)} 
                        className="absolute top-0 right-0 flex items-center gap-2 bg-white text-gray-600 font-semibold py-2 px-4 rounded-lg border border-gray-300 hover:bg-gray-100 transition"
                    >
                        <PencilIcon />
                        Edit Profile
                    </button>
                )}
            </div>

            <div className="bg-white rounded-lg border border-gray-200 shadow-sm overflow-hidden">
                {/* Profile Header */}
                <div className="p-6">
                    <div className="flex items-center space-x-6">
                        {photoURL ? (
                            <img className="h-24 w-24 rounded-full" src={photoURL} alt="Profile avatar" />
                        ) : (
                            <UserCircleIcon className="h-24 w-24 text-gray-400 bg-gray-200 rounded-full" />
                        )}
                        <div>
                            <h1 className="text-2xl font-bold text-gray-800">{name}</h1>
                            <h2 className="text-md text-gray-600">{title}</h2>
                        </div>
                    </div>
                </div>

                {/* About Section */}
                <div className="px-6 py-4 border-t">
                    <h3 className="font-semibold text-lg text-gray-800 mb-2">About</h3>
                    <p className="text-sm text-gray-600 whitespace-pre-wrap">{summary}</p>
                </div>

                {/* Skills Section */}
                {skills && skills.length > 0 && (
                     <div className="px-6 py-4 border-t">
                        <h3 className="font-semibold text-lg text-gray-800 mb-3">Skills</h3>
                        <div className="flex flex-wrap gap-2">
                            {skills.map((skill, index) => (
                                <span key={index} className="bg-gray-200 text-gray-800 text-sm font-medium me-2 px-2.5 py-0.5 rounded-full">
                                    {skill}
                                </span>
                            ))}
                        </div>
                    </div>
                )}
                
                {/* Experience Section */}
                <div className="px-6 py-4 border-t">
                    <h3 className="font-semibold text-lg text-gray-800 mb-4">Experience</h3>
                    <div className="space-y-4">
                        {experience.map((job, index) => (
                            <div key={index} className="flex space-x-4">
                                <div className="w-12 h-12 bg-gray-200 rounded-md flex-shrink-0"></div>
                                <div>
                                    <h4 className="font-semibold text-md text-gray-800">{job.title}</h4>
                                    <p className="text-sm text-gray-600">{job.company}</p>
                                    <p className="text-xs text-gray-500">{job.duration}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Education Section */}
                <div className="px-6 py-4 border-t">
                    <h3 className="font-semibold text-lg text-gray-800 mb-4">Education</h3>
                    <div className="space-y-4">
                        {education.map((school, index) => (
                           <div key={index} className="flex space-x-4">
                                <div className="w-12 h-12 bg-gray-200 rounded-md flex-shrink-0"></div>
                                <div>
                                    <h4 className="font-semibold text-md text-gray-800">{school.institution}</h4>
                                    <p className="text-sm text-gray-600">{school.degree}</p>
                                    <p className="text-xs text-gray-500">{school.duration}</p>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </main>
    )
}


// --- MAIN APP COMPONENT ---
export default function App() {
  const [user, setUser] = useState(null);
  const [posts, setPosts] = useState([]);
  const [isLoaded, setIsLoaded] = useState(false);
  const [currentPage, setCurrentPage] = useState({ view: 'feed', profileId: null });
  const [profileData, setProfileData] = useState(null);
  const dbRef = useRef(null);
  const authRef = useRef(null);

  // One-time initialization
  useEffect(() => {
    setIsLoaded(true);
    if (!dbRef.current) {
      dbRef.current = getFirestore(app);
      authRef.current = getAuth(app);

      onAuthStateChanged(authRef.current, async (currentUser) => {
        if (currentUser) {
          setUser(currentUser);

          // Create a user profile document if it doesn't exist
          const userDocRef = doc(dbRef.current, `artifacts/${appId}/public/data/users`, currentUser.uid);
          const userDoc = await getDoc(userDocRef);

          if (!userDoc.exists()) {
            await setDoc(userDocRef, {
              name: currentUser.displayName || 'Anonymous User',
              title: 'Proconnect Member',
              photoURL: currentUser.photoURL,
              summary: 'This is a summary about the user.',
              skills: ['React', 'Firebase', 'Tailwind CSS'],
              experience: [
                { title: 'Software Engineer', company: 'Tech Corp', duration: '2020 - Present' },
                { title: 'Intern', company: 'StartUp Inc', duration: '2019 - 2020' }
              ],
              education: [
                { institution: 'University of Technology', degree: 'B.S. in Computer Science', duration: '2016-2020' }
              ]
            });
          }
        } else {
          try {
            const token = typeof __initial_auth_token !== 'undefined' ? __initial_auth_token : null;
            if (token) {
              await signInWithCustomToken(authRef.current, token);
            } else {
              await signInAnonymously(authRef.current);
            }
          } catch (error) {
            console.error('Authentication failed:', error);
          }
        }
      });
    }
  }, []);

  // Firestore listener for posts
  useEffect(() => {
    if (user && dbRef.current) {
      const postsCollectionPath = `artifacts/${appId}/public/data/posts`;
      const q = query(collection(dbRef.current, postsCollectionPath), orderBy('timestamp', 'desc'));

      const unsubscribe = onSnapshot(
        q,
        (snapshot) => {
          setPosts(snapshot.docs.map((doc) => ({ id: doc.id, ...doc.data() })));
        },
        (error) => {
          console.error('Error fetching posts:', error);
        }
      );

      return () => unsubscribe();
    }
  }, [user]);

  // Fetch profile data when view changes
  useEffect(() => {
    const fetchProfileData = async () => {
      if (currentPage.view === 'profile' && currentPage.profileId && dbRef.current) {
        const userDocRef = doc(dbRef.current, `artifacts/${appId}/public/data/users`, currentPage.profileId);
        const userDoc = await getDoc(userDocRef);
        if (userDoc.exists()) {
          setProfileData(userDoc.data());
        } else {
          console.log('No such profile!');
          setCurrentPage({ view: 'feed', profileId: null });
        }
      }
    };
    fetchProfileData();
  }, [currentPage]);

  const handlePost = async (content) => {
    if (!user || !dbRef.current) return;

    const postsCollectionPath = `artifacts/${appId}/public/data/posts`;

    await addDoc(collection(dbRef.current, postsCollectionPath), {
      authorId: user.uid,
      authorName: user.displayName || 'Anonymous User',
      authorTitle: 'Proconnect Member',
      authorPhotoURL: user.photoURL || null,
      content: content,
      timestamp: serverTimestamp()
    });
  };

  const handleUpdateProfile = async (updatedProfile) => {
    if (!user || !dbRef.current) return;
    const userDocRef = doc(dbRef.current, `artifacts/${appId}/public/data/users`, user.uid);
    await updateDoc(userDocRef, updatedProfile);
    setProfileData(updatedProfile); // Immediately update local state for a better UX
  };

  const handleViewProfile = (profileId) => {
    setCurrentPage({ view: 'profile', profileId });
  };

  const handleGoHome = () => {
    setCurrentPage({ view: 'feed', profileId: null });
  };

  const renderContent = () => {
    if (currentPage.view === 'profile' && profileData) {
      return (
        <ProfilePage
          profileData={profileData}
          onGoHome={handleGoHome}
          isOwnProfile={user.uid === currentPage.profileId}
          onUpdateProfile={handleUpdateProfile}
        />
      );
    }

    return (
      <>
        <Sidebar user={user} onViewProfile={handleViewProfile} />
        <Feed user={user} posts={posts} onPost={handlePost} onViewProfile={handleViewProfile} />
        <Widgets />
      </>
    );
  };

  if (!user) {
    return <div className="flex justify-center items-center min-h-screen bg-gray-50">Loading...</div>;
  }

  return (
    <div className="bg-gray-50 min-h-screen font-sans">
      <Header user={user} onViewProfile={handleViewProfile} onGoHome={handleGoHome} />
      <div
        className={`container mx-auto px-4 sm:px-6 lg:px-8 py-6 transition-opacity duration-1000 ${
          isLoaded ? 'opacity-100' : 'opacity-0'
        }`}
      >
        <div className="flex justify-center gap-6">{renderContent()}</div>
      </div>
    </div>
  );
}
