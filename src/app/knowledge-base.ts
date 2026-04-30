export interface SystemDesignScenario {
  id: string;
  title: string;
  description: string;
  requirements: string[];
}

export const SCENARIOS: SystemDesignScenario[] = [
  {
    id: 'tinyurl',
    title: 'URL Shortening (TinyURL)',
    description: 'Design a URL shortening service that provides short aliases redirecting to long URLs.',
    requirements: [
      'Given a URL, generate a shorter and unique alias.',
      'Redirect short link to original link.',
      'Custom short links.',
      'Links expire after a default timespan.',
      'Highly available and low latency.',
      'Shortened links should not be predictable.',
    ],
  },
  {
    id: 'pastebin',
    title: 'Pastebin',
    description: 'Design a Pastebin like web service, where users can store plain text and get a randomly generated URL to access it.',
    requirements: [
      'Upload or paste data and get unique URL.',
      'Data and links expire after a specific timespan.',
      'Users should be able to pick a custom alias.',
      'Highly reliable (no data lost) and highly available.',
    ],
  },
  {
    id: 'instagram',
    title: 'Instagram',
    description: 'Design a photo-sharing service like Instagram, where users can upload photos to share them with other users.',
    requirements: [
       'Upload/download/view photos.',
       'Search based on photo/video titles.',
       'Follow other users.',
       'Generate and display user\'s News Feed (top photos from followed users).',
       'Highly available with acceptable latency < 200ms for News Feed.',
    ],
  },
  {
    id: 'dropbox',
    title: 'Dropbox / Google Drive',
    description: 'Design a file hosting service that allows users to store and sync their data on remote servers.',
    requirements: [
       'Upload and download files/photos from any device.',
       'Share files or folders with other users.',
       'Automatic synchronization between devices.',
       'Store large files up to a GB.',
       'ACID-ity for all file operations.',
       'Offline editing support with sync once online.',
    ],
  },
  {
    id: 'facebook-messenger',
    title: 'Facebook Messenger',
    description: 'Design an instant messaging service like Facebook Messenger where users can send text messages to each other.',
    requirements: [
      'Support one-on-one conversations between users.',
      'Keep track of online/offline statuses of its users.',
      'Persistent storage of chat history.',
      'Real-time chat experience with minimum latency.',
      'Highly consistent across devices.',
    ],
  },
  {
    id: 'api-rate-limiter',
    title: 'API Rate Limiter',
    description: 'Design an API Rate Limiter which will throttle users based upon the number of the requests they are sending.',
    requirements: [
      'Limit the number of requests an entity can send to an API within a time window.',
      'The APIs are accessible through a cluster, so rate limits should be considered across multiple servers.',
      'The system should be highly available.',
      'Do not introduce substantial latencies affecting user experience.',
    ],
  },
  {
    id: 'system-basics',
    title: 'System Design Basics',
    description: 'Core concepts for distributed scalable systems architectures.',
    requirements: [
      'Explain Scalability (Horizontal vs Vertical).',
      'Explain the CAP Theorem and its implications.',
      'Discuss Load Balancing algorithms (Round Robin, Least Connection, etc.).',
      'Caching strategies (Write-Through, Write-Behind, Eviction Policies).',
      'Data Partitioning / Sharding and Consistent Hashing.',
    ],
  },
];
