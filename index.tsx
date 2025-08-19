import React, { useState, useEffect, useMemo, useRef } from 'react';
import ReactDOM from 'react-dom/client';
import { GoogleGenAI } from '@google/genai';

// Make sure the 'marked' library is available globally
declare const marked: {
  parse(markdown: string): string;
};

declare global {
  interface Window {
    SpeechRecognition: any;
    webkitSpeechRecognition: any;
  }
}

const apiTemplates = [
  {
    name: 'Summarize Text',
    description: 'Condenses long text into key bullet points.',
    promptPrefix: 'Summarize the following text in five key bullet points: ',
    placeholder: 'Enter a long article or text to summarize...',
    endpoint: '/v1/summarize',
    type: 'text',
    model: 'gemini-2.5-flash'
  },
  {
    name: 'Universal Translator',
    description: 'Translates English to any specified language.',
    promptPrefix: 'Translate the following English text to ', // The language will be added from the prompt
    placeholder: 'Specify the language, then the text. E.g.,\nFrench: The book is on the table.\nJapanese: How are you?',
    endpoint: '/v1/translate',
    type: 'text',
    model: 'gemini-2.5-flash'
  },
  {
    name: 'Image Generator',
    description: 'Creates a high-quality image from a text description.',
    promptPrefix: '', // The user prompt is used directly for image generation
    placeholder: 'A photorealistic image of a cat wearing a tiny top hat...',
    endpoint: '/v1/generate-image',
    type: 'image',
    model: 'imagen-3.0-generate-002'
  },
  {
    name: 'Video Generator',
    description: 'Creates a short video clip from a text description. (May take a few minutes)',
    promptPrefix: '',
    placeholder: 'A cinematic shot of a futuristic city at night, with flying cars...',
    endpoint: '/v1/generate-video',
    type: 'video',
    model: 'veo-2.0-generate-001'
  },
  {
    name: 'Image-to-Text Extractor',
    description: 'Describes an image or answers questions about it.',
    promptPrefix: '', // Will be handled in the prompt logic
    placeholder: 'Optional: Ask a question about the image (e.g., "What color is the car?"). Leave blank for a general description.',
    endpoint: '/v1/analyze-image',
    type: 'image-to-text',
    model: 'gemini-2.5-flash'
  },
  {
    name: 'Speech-to-Text Transcriber',
    description: 'Uses your microphone to transcribe spoken words into text.',
    promptPrefix: '',
    placeholder: 'Click "Start Listening" and begin speaking...',
    endpoint: '/v1/transcribe-speech',
    type: 'audio',
    model: 'n/a (uses browser Web Speech API)'
  },
  {
    name: 'Text-to-Speech Converter',
    description: 'Converts written text into spoken words using a synthetic voice.',
    promptPrefix: '',
    placeholder: 'Enter text here and click "Speak Text" to hear it spoken aloud...',
    endpoint: '/v1/synthesize-speech',
    type: 'audio',
    model: 'n/a (uses browser Web Speech API)'
  },
  {
    name: 'Text-to-Music Creator',
    description: 'Generates a detailed description of a musical piece from a prompt.',
    promptPrefix: 'Describe a musical piece in detail based on this prompt: ',
    placeholder: 'e.g., "A fast-paced electronic track for a car chase scene"...',
    endpoint: '/v1/create-music-description',
    type: 'text',
    model: 'gemini-2.5-flash'
  },
  {
    name: 'Sound Effect Generator',
    description: 'Creates a textual description of a requested sound effect.',
    promptPrefix: 'Describe the sound of: ',
    placeholder: 'e.g., "A magical spell being cast"...',
    endpoint: '/v1/generate-sound-effect',
    type: 'text',
    model: 'gemini-2.5-flash'
  },
  {
    name: 'Weather Forecaster',
    description: 'Provides a weather forecast for a specified location.',
    promptPrefix: 'Provide a simple weather forecast for the following location: ',
    placeholder: 'Enter a city name, e.g., London, UK...',
    endpoint: '/v1/weather',
    type: 'text',
    model: 'gemini-2.5-flash'
  },
  {
    name: 'Recipe Creator',
    description: 'Generates a recipe based on ingredients you have.',
    promptPrefix: 'Create a simple recipe using the following ingredients: ',
    placeholder: 'List your ingredients, e.g., chicken, rice, broccoli, soy sauce...',
    endpoint: '/v1/create-recipe',
    type: 'text',
    model: 'gemini-2.5-flash'
  },
  {
    name: 'Email Writer',
    description: 'Drafts a professional email for a specific purpose.',
    promptPrefix: 'Write a professional email for the following situation: ',
    placeholder: 'e.g., "An email to my boss requesting a day off next Friday"...',
    endpoint: '/v1/write-email',
    type: 'text',
    model: 'gemini-2.5-flash'
  },
  {
    name: 'Code Debugger',
    description: 'Finds and suggests fixes for bugs in code snippets.',
    promptPrefix: 'Debug the following code snippet and explain the issue and the fix: ',
    placeholder: 'Paste a piece of code that has a bug...',
    endpoint: '/v1/debug-code',
    type: 'text',
    model: 'gemini-2.5-flash'
  },
  {
    name: 'Code Explainer',
    description: 'Explains a snippet of code in plain English.',
    promptPrefix: 'Explain the following code snippet line by line: ',
    placeholder: 'Enter a piece of code to explain...',
    endpoint: '/v1/explain-code',
    type: 'text',
    model: 'gemini-2.5-flash'
  },
  {
    name: 'Chatbot Assistant',
    description: 'A helpful assistant to answer your questions.',
    promptPrefix: 'You are a helpful assistant. The user says: ',
    placeholder: 'Ask me anything...',
    endpoint: '/v1/chat',
    type: 'text',
    model: 'gemini-2.5-flash'
  },
  {
    name: 'Product Namer',
    description: 'Generates creative names for a product concept.',
    promptPrefix: 'Generate 10 creative and catchy names for a product described as: ',
    placeholder: 'Describe your product (e.g., a smart coffee mug)...',
    endpoint: '/v1/generate-names',
    type: 'text',
    model: 'gemini-2.5-flash'
  },
  {
    name: 'JSON Extractor',
    description: 'Pulls structured data from unstructured text.',
    promptPrefix: 'Extract the key information from the following text and return it as a valid JSON object with keys for "name", "email", and "company": ',
    placeholder: 'Enter text containing contact info, e.g., "John Doe works at ExampleCorp and his email is john@example.com"...',
    endpoint: '/v1/extract-json',
    type: 'text',
    model: 'gemini-2.5-flash'
  },
  {
    name: 'Sentiment Analyzer',
    description: 'Determines if text is Positive, Negative, or Neutral.',
    promptPrefix: 'Analyze the sentiment of the following text and respond with only "Positive", "Negative", or "Neutral": ',
    placeholder: 'Enter text to analyze, e.g., "This new feature is amazing!"...',
    endpoint: '/v1/analyze-sentiment',
    type: 'text',
    model: 'gemini-2.5-flash'
  },
  {
    name: 'Story Writer',
    description: 'Generates a short story from a creative prompt.',
    promptPrefix: 'Write a short story (around 200 words) based on this idea: ',
    placeholder: 'Enter a story prompt, e.g., "A robot who discovers music for the first time"...',
    endpoint: '/v1/write-story',
    type: 'text',
    model: 'gemini-2.5-flash'
  },
  {
    name: 'Lyrics Finder',
    description: 'Finds the lyrics for a song given the title and artist.',
    promptPrefix: 'Find the full lyrics for the song titled ',
    placeholder: 'Enter song title and artist, e.g., "Bohemian Rhapsody by Queen"...',
    endpoint: '/v1/find-lyrics',
    type: 'text',
    model: 'gemini-2.5-flash'
  },
  {
    name: 'Secure Password Generator',
    description: 'Creates a strong, random password based on your criteria.',
    promptPrefix: 'Generate a secure, random password that meets the following criteria: ',
    placeholder: 'e.g., "16 characters long, including uppercase letters, numbers, and symbols"...',
    endpoint: '/v1/generate-password',
    type: 'text',
    model: 'gemini-2.5-flash'
  },
  {
    name: 'YouTube Info Extractor',
    description: 'Extracts title, artist, and a summary from a YouTube link. (Does not download video/audio).',
    promptPrefix: 'From the content of the YouTube link provided, extract the song title, artist, and a brief summary of the video: ',
    placeholder: 'Enter a YouTube URL, e.g., https://www.youtube.com/watch?v=...',
    endpoint: '/v1/extract-youtube-info',
    type: 'text',
    model: 'gemini-2.5-flash'
  },
  {
    name: 'Lyrics to Music Composer',
    description: 'Composes a musical description for a song based on its lyrics.',
    promptPrefix: 'Compose a detailed musical description (including genre, tempo, instruments, and mood) for a song with the following lyrics: ',
    placeholder: 'Enter song lyrics here...',
    endpoint: '/v1/compose-music-from-lyrics',
    type: 'text',
    model: 'gemini-2.5-flash'
  },
  {
    name: 'Lyrics to Music Video',
    description: 'Generates a music video concept from song lyrics. (May take a few minutes)',
    promptPrefix: 'Create a music video based on the following lyrics: ',
    placeholder: 'Enter song lyrics to generate a video...',
    endpoint: '/v1/generate-video-from-lyrics',
    type: 'video',
    model: 'veo-2.0-generate-001'
  }
] as const;


interface ApiOption {
  id: string;
  name: string;
  description: string;
  promptPrefix: string;
  placeholder: string;
  endpoint: string;
  type: 'text' | 'image' | 'video' | 'audio' | 'image-to-text';
  model: string;
  analyticsData: number[];
}

const generateApis = (count: number): ApiOption[] => {
    const adjectives = ['Advanced', 'Secure', 'Rapid', 'Global', 'Enterprise', 'Dynamic', 'Custom', 'Automated', 'Intelligent', 'Core', 'Streamlined', 'Agile', 'NextGen', 'Scalable', 'Robust'];
    const nouns = ['Service', 'Utility', 'Endpoint', 'Function', 'Tool', 'API', 'Connector', 'Module', 'Interface', 'Gateway', 'Platform', 'Engine', 'System', 'Hub'];
    const domains = ['Marketing', 'Finance', 'Logistics', 'Analytics', 'Content', 'User', 'Product', 'Data', 'Compliance', 'Identity'];

    const apis: ApiOption[] = [];
    const usedNames = new Set<string>();

    let i = 1;
    while (apis.length < count) {
        const template = apiTemplates[i % apiTemplates.length];
        const adjective = adjectives[Math.floor(Math.random() * adjectives.length)];
        const noun = nouns[Math.floor(Math.random() * nouns.length)];
        const domain = domains[Math.floor(Math.random() * domains.length)];
        
        let uniqueName = '';
        const nameType = Math.random();
        if (nameType < 0.33) {
             uniqueName = `${domain} ${template.name} ${noun}`;
        } else if (nameType < 0.66) {
             uniqueName = `${adjective} ${domain} ${noun}`;
        } else {
             uniqueName = `${adjective} ${template.name}`;
        }

        if (!usedNames.has(uniqueName)) {
            usedNames.add(uniqueName);
            const analyticsData = Array.from({ length: 7 }, () => Math.floor(Math.random() * 250) + 20); // Random calls for 7 days
            apis.push({
                id: `api-${apis.length + 1}`,
                name: uniqueName,
                description: template.description,
                promptPrefix: template.promptPrefix,
                placeholder: template.placeholder,
                endpoint: `${template.endpoint}/${apis.length + 1}`,
                type: template.type,
                model: template.model,
                analyticsData,
            });
        }
        i++;
    }
    return apis;
};


type ApiKey = string;
type ApiStatus = 'idle' | 'checking' | 'live' | 'offline';

const generateCodeSnippet = (api: ApiOption | null) => {
  if (!api) return '';
  const apiUrl = `https://api.coolshotsystems.com${api.endpoint}`;
  
  let bodyContent = `text: "Your input text goes here..."`;
  if (api.type === 'image' || api.type === 'video') {
    bodyContent = `prompt: "Your creative prompt goes here..."`;
  } else if (api.type === 'image-to-text') {
    bodyContent = `image_base64: "your_base64_encoded_image_string",\n    prompt: "Optional: Your question about the image..."`;
  }

  return `
fetch('${apiUrl}', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Authorization': 'Bearer professor'
  },
  body: JSON.stringify({
    ${bodyContent}
  })
})
.then(response => response.json())
.then(data => console.log(data));
  `.trim();
};

interface LiveRequest {
  model: string;
  apiKey: string;
  prompt: string;
}

const AnalyticsChart: React.FC<{ data: number[] }> = ({ data }) => {
    const maxValue = Math.max(...data, 1); // Avoid division by zero
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const todayIndex = new Date().getDay();
    const labels = [...days.slice(todayIndex + 1), ...days.slice(0, todayIndex + 1)];

    return (
        <div className="chart-container" aria-label="API usage chart for the last 7 days">
            {data.map((value, index) => (
                <div className="chart-bar-wrapper" key={index}>
                    <div className="tooltip">{value} calls</div>
                    <div
                        className="chart-bar"
                        style={{ height: `${(value / maxValue) * 100}%` }}
                        aria-label={`${labels[index]}: ${value} calls`}
                    ></div>
                    <span className="chart-label">{labels[index]}</span>
                </div>
            ))}
        </div>
    );
};

const App: React.FC = () => {
  const [allApis] = useState(() => generateApis(1000));
  const [selectedApi, setSelectedApi] = useState<ApiOption | null>(null);
  const [prompt, setPrompt] = useState<string>('');
  const [result, setResult] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showExplanation, setShowExplanation] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [isCopied, setIsCopied] = useState(false);
  const [liveRequestDetails, setLiveRequestDetails] = useState<LiveRequest | null>(null);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [isListening, setIsListening] = useState<boolean>(false);
  const [isCheckingAll, setIsCheckingAll] = useState<boolean>(false);
  const [activeFilter, setActiveFilter] = useState<ApiOption['type'] | 'all'>('all');
  
  const recognitionRef = useRef<any>(null);
  const loadingMessageIntervalRef = useRef<number | null>(null);

  const APIS_PER_PAGE = 50;

  const [apiStatuses, setApiStatuses] = useState<Record<ApiKey, { status: ApiStatus; latency?: number }>>(() => {
    const initialStatuses = {} as Record<ApiKey, { status: ApiStatus; latency?: number }>;
    allApis.forEach(api => {
      initialStatuses[api.id] = { status: 'idle' };
    });
    return initialStatuses;
  });

  const filteredApis = useMemo(() => {
    return allApis.filter(api => {
      const matchesFilter = activeFilter === 'all' || api.type === activeFilter;
      const matchesSearch = api.name.toLowerCase().includes(searchTerm.toLowerCase()) || 
                            api.description.toLowerCase().includes(searchTerm.toLowerCase());
      return matchesFilter && matchesSearch;
    });
  }, [allApis, searchTerm, activeFilter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [searchTerm, activeFilter]);

  const totalPages = Math.ceil(filteredApis.length / APIS_PER_PAGE);
  const paginatedApis = filteredApis.slice((currentPage - 1) * APIS_PER_PAGE, currentPage * APIS_PER_PAGE);

  const isSpeechToText = selectedApi?.type === 'audio' && selectedApi.name.includes('Speech-to-Text');
  const isTextToSpeech = selectedApi?.type === 'audio' && selectedApi.name.includes('Text-to-Speech');

  const handleSelectApi = (api: ApiOption) => {
    setSelectedApi(api);
    setPrompt('');
    setResult('');
    setError(null);
    setLiveRequestDetails(null);
    setImageFile(null);
    setImagePreview(null);
    if (recognitionRef.current && isListening) {
      recognitionRef.current.stop();
      setIsListening(false);
    }
  };

  const handleStatusCheck = (apiKey: ApiKey) => {
    setApiStatuses(prev => ({ ...prev, [apiKey]: { status: 'checking' } }));
    
    const latency = Math.floor(Math.random() * (1200 - 300 + 1)) + 300;
    setTimeout(() => {
      const isLive = Math.random() > 0.1; // 90% chance of being live
      setApiStatuses(prev => ({
        ...prev,
        [apiKey]: {
          status: isLive ? 'live' : 'offline',
          latency: isLive ? latency : undefined
        }
      }));
    }, latency);
  };
  
  const handleCheckAllStatuses = () => {
    setIsCheckingAll(true);
    const apisToCheck = filteredApis;

    const checkingStatuses = apisToCheck.reduce((acc, api) => {
      acc[api.id] = { status: 'checking' };
      return acc;
    }, {} as Record<string, { status: ApiStatus; latency?: number }>);
    setApiStatuses(prev => ({ ...prev, ...checkingStatuses }));

    apisToCheck.forEach((api, index) => {
      setTimeout(() => {
        handleStatusCheck(api.id);
      }, index * 50);
    });

    const totalTime = (apisToCheck.length * 50) + 1200;
    setTimeout(() => {
      setIsCheckingAll(false);
    }, totalTime);
  };

  const handleTextToSpeech = () => {
    if (!('speechSynthesis' in window)) {
        setError('Sorry, your browser does not support text-to-speech.');
        return;
    }
    if (!prompt.trim()) {
        setError('Please enter some text to speak.');
        return;
    }
    setError(null);
    const utterance = new SpeechSynthesisUtterance(prompt);
    window.speechSynthesis.speak(utterance);
  };

  const handleSpeechRecognition = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRecognition) {
        setError('Sorry, your browser does not support speech recognition.');
        return;
    }

    if (isListening) {
        recognitionRef.current?.stop();
        setIsListening(false);
    } else {
        const recognition = new SpeechRecognition();
        recognition.continuous = true;
        recognition.interimResults = true;
        recognition.lang = 'en-US';

        recognition.onstart = () => {
            setIsListening(true);
            setError(null);
        };

        recognition.onend = () => {
            setIsListening(false);
        };

        recognition.onerror = (event: any) => {
            setError(`Speech recognition error: ${event.error}`);
            setIsListening(false);
        };

        recognition.onresult = (event: any) => {
            let finalTranscript = '';
            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                }
            }
            setPrompt(prev => prev + finalTranscript + ' ');
        };
        
        recognitionRef.current = recognition;
        recognition.start();
    }
  };
  
  const handleGenerate = async () => {
    if (isTextToSpeech) {
        handleTextToSpeech();
        return;
    }
    if (isSpeechToText) {
        handleSpeechRecognition();
        return;
    }
    
    if (!selectedApi) {
      setError('Please select an API to call.');
      return;
    }
    
    if (selectedApi.type !== 'image-to-text' && !prompt.trim()) {
      setError('Please enter some input for the API.');
      return;
    }

    setIsLoading(true);
    setResult('');
    setError(null);

    if (loadingMessageIntervalRef.current) {
        clearInterval(loadingMessageIntervalRef.current);
    }

    try {
      // Simulate potential API errors for a more realistic experience
      const shouldSimulateError = Math.random() < 0.15; // 15% chance of simulated error
      if (shouldSimulateError) {
          const errors = [
              { code: 401, message: 'Unauthorized - The provided API Key is invalid.' },
              { code: 429, message: 'Rate Limit Exceeded - Too many requests. Please try again later.' },
              { code: 503, message: 'Service Unavailable - The service is temporarily down for maintenance.' }
          ];
          const randomError = errors[Math.floor(Math.random() * errors.length)];
          throw new Error(`Simulated Error: ${randomError.code} - ${randomError.message}`);
      }

      const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });
      
      setLiveRequestDetails({
          model: selectedApi.model,
          apiKey: 'professor (••••••or)',
          prompt: selectedApi.promptPrefix ? `${selectedApi.promptPrefix}${prompt}` : prompt,
      });

      if (selectedApi.type === 'image-to-text') {
        if (!imageFile) {
            setError('Please upload an image to analyze.');
            setIsLoading(false);
            return;
        }
        
        const fileToGenerativePart = async (file: File) => {
            const base64EncodedDataPromise = new Promise((resolve) => {
                const reader = new FileReader();
                reader.onloadend = () => resolve((reader.result as string).split(',')[1]);
                reader.readAsDataURL(file);
            });
            return {
                inlineData: { data: await base64EncodedDataPromise, mimeType: file.type },
            };
        };

        const imagePart = await fileToGenerativePart(imageFile);
        const textPart = { text: prompt };

        const fullPromptForDisplay = prompt ? `${prompt} (with uploaded image)` : `(Image analysis)`;
        setLiveRequestDetails(prev => prev ? { ...prev, prompt: fullPromptForDisplay } : null);

        const response = await ai.models.generateContent({
            model: selectedApi.model,
            contents: { parts: [imagePart, textPart] }
        });
        const htmlContent = marked.parse(response.text);
        setResult(htmlContent);

      } else if (selectedApi.type === 'image') {
        const response = await ai.models.generateImages({
          model: selectedApi.model,
          prompt: prompt,
          config: {
            numberOfImages: 1,
            outputMimeType: 'image/png',
          },
        });
        const base64ImageBytes = response.generatedImages[0].image.imageBytes;
        const imageUrl = `data:image/png;base64,${base64ImageBytes}`;
        setResult(`<img src="${imageUrl}" alt="Generated image: ${prompt}" class="generated-image" />`);

      } else if (selectedApi.type === 'video') {
        const videoLoadingMessages = [
            "Warming up the video render farm...",
            "Compositing pixels into a masterpiece...",
            "This can take a minute or two, please be patient...",
            "Finalizing the video stream...",
            "Almost there..."
        ];
        let messageIndex = 0;
        
        const updateLoadingMessage = () => {
            const message = videoLoadingMessages[messageIndex];
            setResult(`<div class="loading-spinner" role="status" aria-label="Loading response"><div class="spinner"></div><p class="loading-message">${message}</p></div>`);
            messageIndex = (messageIndex + 1) % videoLoadingMessages.length;
        };

        updateLoadingMessage();
        loadingMessageIntervalRef.current = window.setInterval(updateLoadingMessage, 5000);
        
        const fullPrompt = `${selectedApi.promptPrefix}${prompt}`;
        setLiveRequestDetails(prev => prev ? { ...prev, prompt: fullPrompt } : null);

        let operation = await ai.models.generateVideos({
            model: selectedApi.model,
            prompt: fullPrompt,
            config: { numberOfVideos: 1 }
        });

        while (!operation.done) {
            await new Promise(resolve => setTimeout(resolve, 10000));
            operation = await ai.operations.getVideosOperation({ operation: operation });
        }

        if (loadingMessageIntervalRef.current) {
            clearInterval(loadingMessageIntervalRef.current);
        }

        if (operation.response?.generatedVideos?.[0]?.video?.uri) {
            const downloadLink = operation.response.generatedVideos[0].video.uri;
            const videoUrl = `${downloadLink}&key=${process.env.API_KEY}`;
            setResult(`<video controls autoplay loop muted class="generated-video" src="${videoUrl}" title="Generated video: ${prompt}" />`);
        } else {
            throw new Error("Video generation completed but no video URI was returned.");
        }

      } else { // Handle text-based APIs
        let fullPrompt = `${selectedApi.promptPrefix}${prompt}`;

        if (selectedApi.name.includes('Universal Translator')) {
          const parts = prompt.match(/^([a-zA-Z\s\-]+):\s*(.*)/s);
          if (parts && parts.length === 3) {
            const language = parts[1].trim();
            const textToTranslate = parts[2].trim();
            fullPrompt = `${selectedApi.promptPrefix}${language}: ${textToTranslate}`;
          } else {
            setError('Invalid format for translator. Please use the format "Language: Text to translate" in the input field.');
            setIsLoading(false);
            return;
          }
        }
        
        setLiveRequestDetails(prev => prev ? { ...prev, prompt: fullPrompt } : null);
        
        const response = await ai.models.generateContent({
          model: selectedApi.model,
          contents: fullPrompt,
        });

        const htmlContent = marked.parse(response.text);
        setResult(htmlContent);
      }

    } catch (err) {
      if (loadingMessageIntervalRef.current) {
          clearInterval(loadingMessageIntervalRef.current);
      }
      console.error(err);
      const errorMessage = err instanceof Error ? err.message : 'An unknown error occurred.';
      if (errorMessage.startsWith('Simulated Error:')) {
          setError(errorMessage.replace('Simulated Error: ', ''));
      } else {
          setError(`Failed to get a response. Please check your API key and network connection. Error: ${errorMessage}`);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleExportApis = () => {
    const jsonString = JSON.stringify(allApis, null, 2);
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'api_list.json';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const handleCopyCode = () => {
    if (!selectedApi) return;
    navigator.clipboard.writeText(codeSnippet).then(() => {
        setIsCopied(true);
        setTimeout(() => setIsCopied(false), 2000);
    });
  };
  
  const handleImageChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setImageFile(file);
      const reader = new FileReader();
      reader.onloadend = () => {
        setImagePreview(reader.result as string);
      };
      reader.readAsDataURL(file);
      setError(null);
    }
  };

  const isApiSelected = !!selectedApi;
  const currentStatus = selectedApi ? apiStatuses[selectedApi.id].status : 'idle';
  const codeSnippet = generateCodeSnippet(selectedApi);
  const apiUrl = selectedApi ? `https://api.coolshotsystems.com${selectedApi?.endpoint}` : '';
  const apiTypes: (ApiOption['type'] | 'all')[] = ['all', 'text', 'image', 'video', 'audio', 'image-to-text'];

  return (
    <div className="container">
      <header>
        <h1>Custom API Simulator</h1>
        <p>Choose one of your "custom" APIs below. Each one uses Gemini in the background to perform a specific task.</p>
      </header>
      
      <main>
        <section className="explanation-section">
          <button onClick={() => setShowExplanation(!showExplanation)} className="explanation-toggle" aria-expanded={showExplanation} aria-controls="explanation-content">
            <span>How This Simulator Works</span>
            <span className={`arrow ${showExplanation ? 'up' : 'down'}`}></span>
          </button>
          {showExplanation && (
            <div id="explanation-content" className="explanation-content">
              <p><strong>This application is a frontend-only simulator. There is no backend server to install!</strong></p>
              <ol>
                <li>You choose a "custom API" from the dashboard.</li>
                <li>You can check its "status" which simulates a network health check.</li>
                <li>The app shows you what a real API endpoint and code snippet might look like.</li>
                <li>When you click "Call My API", it uses the Google Gemini API directly in your browser to perform the task.</li>
              </ol>
            </div>
          )}
        </section>

        <section className="api-dashboard">
            <div className="dashboard-header">
                <div className="dashboard-title">
                    <h2>Your API Dashboard</h2>
                    <button onClick={handleCheckAllStatuses} className="check-all-btn" disabled={isCheckingAll}>
                        {isCheckingAll ? 'Checking All...' : 'Check All Statuses'}
                    </button>
                    <button onClick={handleExportApis} className="export-btn">Export as JSON</button>
                </div>
                <div className="search-container">
                    <input 
                        type="search"
                        placeholder="Search APIs by name or description..."
                        className="search-input"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>
          <div className="api-filter-nav">
              {apiTypes.map((type) => (
                  <button
                      key={type}
                      className={`filter-btn ${activeFilter === type ? 'active' : ''}`}
                      onClick={() => setActiveFilter(type)}
                  >
                      {type === 'all' ? 'All APIs' : type.replace('-', ' to ')}
                  </button>
              ))}
          </div>
          <div className="api-list">
            {paginatedApis.map((api) => {
              const statusInfo = apiStatuses[api.id];
              return (
                <div 
                  key={api.id} 
                  className={`api-card ${selectedApi?.id === api.id ? 'selected' : ''}`}
                  onClick={() => handleSelectApi(api)}
                  tabIndex={0}
                  onKeyPress={(e) => (e.key === 'Enter' || e.key === ' ') && handleSelectApi(api)}
                >
                  <div className="api-card-header">
                    <h3>{api.name}</h3>
                    <span className={`api-type-badge type-${api.type}`}>{api.type}</span>
                  </div>
                  <p>{api.description}</p>
                  <div className="api-card-footer">
                     <div className="api-status" aria-live="polite">
                        <span className={`status-indicator ${statusInfo.status}`}></span>
                        <span className="status-text">
                            {statusInfo.status === 'idle' && 'Status: Unknown'}
                            {statusInfo.status === 'checking' && 'Status: Checking...'}
                            {statusInfo.status === 'live' && `Status: Live (${statusInfo.latency}ms)`}
                            {statusInfo.status === 'offline' && 'Status: Offline'}
                        </span>
                     </div>
                     <button 
                        className="status-check-btn" 
                        onClick={(e) => { e.stopPropagation(); handleStatusCheck(api.id); }}
                        disabled={statusInfo.status === 'checking'}
                     >
                        {statusInfo.status === 'checking' ? 'Checking...' : 'Check Status'}
                     </button>
                  </div>
                </div>
              );
            })}
          </div>
            {filteredApis.length === 0 && searchTerm && (
                <p className="no-results">No APIs found for "{searchTerm}".</p>
            )}
            <div className="pagination-container">
                <span className="page-info">
                    Showing {paginatedApis.length > 0 ? Math.min((currentPage - 1) * APIS_PER_PAGE + 1, filteredApis.length) : 0}-{Math.min(currentPage * APIS_PER_PAGE, filteredApis.length)} of {filteredApis.length} APIs
                </span>
                <div className="page-controls">
                    <button onClick={() => setCurrentPage(p => p - 1)} disabled={currentPage === 1} className="page-btn">Previous</button>
                    <button onClick={() => setCurrentPage(p => p + 1)} disabled={currentPage === totalPages || totalPages === 0} className="page-btn">Next</button>
                </div>
            </div>
        </section>

        {isApiSelected && (
          <>
            <div className="input-section">
              {selectedApi.type === 'image-to-text' && (
                  <div className="image-uploader">
                      <input 
                          type="file" 
                          accept="image/*" 
                          onChange={handleImageChange} 
                          id="image-upload-input" 
                          aria-label="Upload an image"
                          disabled={isLoading}
                      />
                      <label htmlFor="image-upload-input" className="image-upload-label">
                          {imagePreview ? 'Change Image' : 'Select Image'}
                      </label>
                      {imagePreview && <img src={imagePreview} alt="Image preview" className="image-preview" />}
                  </div>
              )}
              <textarea
                value={prompt}
                onChange={(e) => setPrompt(e.target.value)}
                placeholder={selectedApi?.placeholder}
                aria-label="API input"
                disabled={isLoading || currentStatus !== 'live' || isListening}
              />
              <button 
                onClick={handleGenerate} 
                disabled={isLoading || currentStatus !== 'live' || (selectedApi.type === 'image-to-text' && !imageFile)}
                title={currentStatus !== 'live' ? 'API is not live. Check status.' : 'Call your custom API'}
                className={isListening ? 'listening' : ''}
              >
                {isLoading ? 'Calling API...' : isSpeechToText ? (isListening ? 'Stop Listening' : 'Start Listening') : isTextToSpeech ? 'Speak Text' : 'Call My API'}
              </button>
            </div>

            <section className="api-details-section">
              <h3>Your API Details for "{selectedApi.name}"</h3>
              <p className="note">
                <em>Note: The endpoint and code snippet below are for demonstration purposes. This simulator runs entirely in your browser.</em>
              </p>
              <div className="api-detail">
                <label htmlFor="apiUrl">API Endpoint URL</label>
                <input type="text" id="apiUrl" value={apiUrl} readOnly aria-label="Simulated API Endpoint URL"/>
              </div>
              <div className="api-detail code-snippet-container">
                <label>Example Code Snippet (JavaScript)</label>
                <button onClick={handleCopyCode} className="copy-code-btn">{isCopied ? 'Copied!' : 'Copy'}</button>
                <pre className="code-snippet">
                  <code>{codeSnippet}</code>
                </pre>
              </div>
            </section>
            
            {selectedApi && (
                <section className="analytics-section">
                    <h3>Usage Analytics (Last 7 Days)</h3>
                    <AnalyticsChart data={selectedApi.analyticsData} />
                </section>
            )}

            <section className="results-section">
              <h2>API Response</h2>
              <div className="result-container" aria-live="polite">
                {isLoading && !result && (
                  <div className="loading-spinner" role="status" aria-label="Loading response">
                    <div className="spinner"></div>
                  </div>
                )}
                {error && <p className="error-message" role="alert">{error}</p>}
                {result && <div dangerouslySetInnerHTML={{ __html: result }} />}
                {!isLoading && !error && !result && <p>Select an API and enter a prompt to see the response here...</p>}
              </div>
            </section>
            
            {liveRequestDetails && (
              <section className="live-request-section">
                <h2>Live Request Details</h2>
                <div className="request-details-container">
                    <div className="request-detail-item">
                        <strong>Model Used:</strong>
                        <span>{liveRequestDetails.model}</span>
                    </div>
                    <div className="request-detail-item">
                        <strong>API Key:</strong>
                        <span>{liveRequestDetails.apiKey}</span>
                    </div>
                    <div className="request-detail-item prompt-item">
                        <strong>Full Request Prompt:</strong>
                        <pre><code>{liveRequestDetails.prompt}</code></pre>
                    </div>
                </div>
              </section>
            )}
          </>
        )}
      </main>
    </div>
  );
};

const root = ReactDOM.createRoot(document.getElementById('root') as HTMLElement);
root.render(<App />);