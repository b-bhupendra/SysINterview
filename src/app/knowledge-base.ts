export interface SystemDesignScenario {
  id: string;
  title: string;
  description: string;
  requirements: string[];
}

export const SCENARIOS: SystemDesignScenario[] = [
  {
    id: 'tinyurl',
    title: 'Link Shortener',
    description: 'Design a service that creates abbreviated aliases for lengthy URLs, similar to bit.ly or TinyURL.',
    requirements: [
      'Generate a unique, shorter alias for any given link.',
      'Redirect the abbreviated link to the original destination.',
      'Support user-defined custom aliases.',
      'Implement expiration for generated links.',
      'Ensure high availability and low latency.',
      'Aliases must be unguessable to prevent scraping.',
    ],
  },
  {
    id: 'pastebin',
    title: 'Text Snippet Hosting',
    description: 'Design a web service where users share plain text snippets via generated URLs.',
    requirements: [
      'Provide a random URL upon pasting text data.',
      'Support data expiration after a predefined duration.',
      'Option for custom URLs for snippets.',
      'Guarantee high reliability (no data loss) and uninterrupted availability.',
    ],
  },
  {
    id: 'instagram',
    title: 'Photo Sharing Network',
    description: 'Design a social network for sharing photos, following users, and generating personalized feeds.',
    requirements: [
       'Support uploading, downloading, and viewing visual media.',
       'Provide search functionality for media titles.',
       'Allow users to follow one another.',
       'Compute and display a personalized feed of top followed content.',
       'Maintain high availability and feed generation latency under 200ms.',
    ],
  },
  {
    id: 'dropbox',
    title: 'Cloud Storage & Sync',
    description: 'Design a file hosting solution that synchronizes user data across multiple devices remotely.',
    requirements: [
       'Support reliable file upload and download across devices.',
       'Enable secure file and folder sharing.',
       'Synchronize modifications automatically across a user\'s devices.',
       'Handle large file sizes efficiently natively.',
       'Enforce strict ACID properties for file metadata.',
       'Allow offline edits that sync when connectivity is restored.',
    ],
  },
  {
    id: 'facebook-messenger',
    title: 'Real-time Chat App',
    description: 'Design a text-based instant messaging platform supporting direct messaging and history.',
    requirements: [
      'Facilitate seamless 1-on-1 conversations.',
      'Track and display user presence (online/offline).',
      'Store conversation history persistently.',
      'Deliver real-time message delivery with minimal lag.',
      'Keep message history strongly consistent across devices.',
    ],
  },
  {
    id: 'twitter',
    title: 'Microblogging Service',
    description: 'Design a network where users broadcast short status updates, follow others, and view timelines.',
    requirements: [
      'Publish short text updates (sometimes with media).',
      'Follow other users\' timelines.',
      'Favorite/like specific posts.',
      'Generate a timeline of recent posts from followed accounts.',
      'Accommodate eventual consistency for timelines for the sake of availability.'
    ],
  },
  {
    id: 'youtube',
    title: 'Video Streaming Platform',
    description: 'Design a video sharing site where users can upload, search, and stream videos.',
    requirements: [
      'Upload and host large video files.',
      'Discover videos by searching titles.',
      'Record engagement metrics (likes, dislikes, views).',
      'Provide a real-time, lag-free video streaming experience.',
      'Ensure zero video loss (high reliability).'
    ],
  },
  {
    id: 'typeahead',
    title: 'Search Autocomplete',
    description: 'Design a real-time suggestion service predicting search queries as a user types.',
    requirements: [
      'Suggest top 10 relevant terms based on a typed prefix.',
      'Update suggestions dynamically in real-time.',
      'Maintain extreme low latency (under 200ms).',
      'Scale to thousands of queries per second.'
    ]
  },
  {
    id: 'api-rate-limiter',
    title: 'API Rate Limiter',
    description: 'Design an application-level throttle limiting requests per user or IP.',
    requirements: [
      'Cap the maximum requests an entity can perform within a time window.',
      'Operate securely in a horizontally scaled cluster of servers.',
      'Ensure fail-safe, highly available request validation.',
      'Impose negligible latency on the actual API request.'
    ],
  },
  {
    id: 'twitter-search',
    title: 'Microblog Search',
    description: 'Design a full-text search engine over billions of short text updates.',
    requirements: [
      'Index up to 400 million new updates daily.',
      'Process search queries using multiple keywords (AND/OR).',
      'Provide rapid search results over a massive distributed dataset.',
      'Manage high write loads while optimizing read latency.'
    ]
  },
  {
    id: 'web-crawler',
    title: 'Web Content Crawler',
    description: 'Design a bot that systematically crawls and indexes the World Wide Web.',
    requirements: [
      'Fetch and index hundreds of millions of web pages.',
      'Employ a scalable architecture to crawl concurrently.',
      'Maintain extensibility for future media types.',
      'Respect robots.txt and polite crawling speeds.'
    ]
  },
  {
    id: 'newsfeed',
    title: 'Social Newsfeed',
    description: 'Design a central feed containing updates from friends, pages, and groups.',
    requirements: [
      'Compile dynamic feeds from followed users and pages.',
      'Combine text, images, and video feeds homogeneously.',
      'Append new posts in real-time to active user feeds.',
      'Target maximum end-user latency of 2 seconds for feed generation.',
      'Rapid propagation of a new post to all followers.'
    ]
  },
  {
    id: 'nearby-friends',
    title: 'Location-Based Directory',
    description: 'Design a proximity service to discover restaurants and attractions.',
    requirements: [
      'Update and query places with geographical constraints.',
      'Find all relevant places within a given radius based on user coordinates.',
      'Support adding reviews and ratings to places.',
      'Handle a massive read-heavy search load.'
    ]
  },
  {
    id: 'uber',
    title: 'Ride-Hailing Backend',
    description: 'Design a real-time dispatch system connecting passengers to drivers.',
    requirements: [
      'Track realtime geolocations of thousands of drivers.',
      'Match passengers requesting rides to available nearby drivers.',
      'Track ride progress continuously until drop-off.',
      'Operate under strict real-time and scaling constraints.'
    ]
  },
  {
    id: 'ticketmaster',
    title: 'Ticket Booking System',
    description: 'Design an online ticketing platform for movies and events.',
    requirements: [
      'Browse cities, cinemas, movies, and showtimes.',
      'Provide seating maps and interactive seat selection.',
      'Lock seats temporarily during checkout.',
      'Ensure strict ACID compliance to prevent double-booking.',
      'Support high concurrency during blockbuster releases.'
    ]
  },
  {
    id: 'system-basics',
    title: 'System Design Basics',
    description: 'Core concepts for distributed scalable systems architectures.',
    requirements: [
      'Evaluate Scalability methods (Horizontal vs Vertical).',
      'Examine the CAP Theorem and eventual consistency tradeoffs.',
      'Implement Load Balancing approaches (Round Robin, Least Connection).',
      'Optimize performance with caching models (Write-Through, Write-Behind).',
      'Analyze Data Partitioning (Sharding) and Consistent Hashing paradigms.'
    ],
  },
];
