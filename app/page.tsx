"use client";
import { useState, useEffect, useCallback, useRef } from "react";
import { Card, CardContent } from "@/components/ui/card";
import Navbar from "@/components/nav/Navbar";
import dynamic from 'next/dynamic';
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Database } from "@/lib/types/schema";
import { getQueryLocation } from "@/lib/cityUtils";
import { motion } from "framer-motion";
import { CardStack } from "@/app/components/CardStack";
import billsData from "@/lib/json/bills.json";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { DataTable } from "@/app/components/data-table"
import { FaVoteYea, FaUserTie, FaLandmark, FaExclamationTriangle, FaDemocrat, FaRepublican } from "react-icons/fa";
import { IconType } from "react-icons";
import { FaUsers, FaChartLine, FaDollarSign, FaBabyCarriage, FaIndustry } from "react-icons/fa";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Command, LayoutDashboard } from "lucide-react";
import sourcesData from "@/lib/json/sources.json";
const ReactPlayer = dynamic(() => import('react-player'), { ssr: false });
import Image from "next/image";
import { useCardStack } from "@/app/components/CardStack";
import { Dialog, DialogContent } from "@/components/ui/dialog";
import { useRouter } from 'next/navigation';
import { useScript } from '@/context/ScriptContext';
import { ScriptProvider } from '@/context/ScriptContext';
import { formatTime } from '@/lib/utils';
import { ColumnDef } from "@tanstack/react-table";

const AnimatedHeader = ({ title, subtitle }: { title: string; subtitle?: string }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <motion.div
      className="w-full bg-gradient-to-r from-blue-50 to-blue-100 px-3 py-2 mb-2 mt-4 rounded-md shadow-sm overflow-hidden border-l-4 border-blue-500"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      initial={{ height: '36px' }}
      animate={{ height: isHovered ? '56px' : '36px' }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
    >
      <motion.h2
        className="text-sm font-medium text-blue-700 mb-1"
        initial={{ opacity: 0, y: 5 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.2 }}
      >
        {title}
      </motion.h2>
      {subtitle && (
        <motion.p
          className="text-xs text-blue-500"
          initial={{ opacity: 0 }}
          animate={{ opacity: isHovered ? 1 : 0 }}
          transition={{ duration: 0.2 }}
        >
          {subtitle}
        </motion.p>
      )}
    </motion.div>
  );
};

type Party = 'Democrat' | 'Republican' | 'Independent';

const partyIcons: Record<Party, IconType> = {
  Democrat: FaDemocrat,
  Republican: FaRepublican,
  Independent: FaLandmark,
};

const PartyIcon = ({ party, className }: { party: Party; className?: string }) => {
  const Icon = partyIcons[party] || FaUsers;
  return <Icon className={className} />;
};

type ScriptItem = {
  start: number;
  end: number;
  word: string;
};

type GroupedScriptItem = {
  time: string;
  content: string;
};

const Home = () => {
  const [cityData, setCityData] = useState<Database['public']['Tables']['cities']['Row'] | null>(null);
  const [voters, setVoters] = useState<Database['public']['Tables']['voter_records']['Row'][]>([]);
  const [selectedVoter, setSelectedVoter] = useState<string | null>(null);
  const [headerText, setHeaderText] = useState<string>("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [isClient, setIsClient] = useState(false);
  const [stateBillInfo, setStateBillInfo] = useState<{
    status: string;
    analysis: string;
  } | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [voterData, setVoterData] = useState<Database['public']['Tables']['voter_records']['Row'] | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const [cardItems, setCardItems] = useState<Array<{ id: number; name: string; designation: string; icon: IconType; content: React.ReactNode }>>([]);
  const { cards, setCards, shuffleToNext } = useCardStack();

  const [dialogContent, setDialogContent] = useState<React.ReactNode | null>(null);
  const [isDialogOpen, setIsDialogOpen] = useState(false);

  const [videoUrl, setVideoUrl] = useState<string | null>(null);

  const { setScript } = useScript();
  const router = useRouter();

  const [currentTime, setCurrentTime] = useState(0);
  // const [searchTerm, setSearchTerm] = useState('');
  const playerRef = useRef<typeof ReactPlayer>(null);
  const tableRef = useRef<HTMLDivElement>(null);

  const [scriptData, setScriptData] = useState<GroupedScriptItem[]>([]);
  const [isVideoLoading, setIsVideoLoading] = useState(false);
  const [isRegeneratingVideo, setIsRegeneratingVideo] = useState(false);

  const handleProgress = useCallback(({ playedSeconds }: { playedSeconds: number }) => {
    setCurrentTime(playedSeconds);
  }, [setCurrentTime]);

  const groupScriptWords = (script: ScriptItem[]): GroupedScriptItem[] => {
    const groupedScript: GroupedScriptItem[] = [];
    let currentGroup: string[] = [];
    let startTime = 0;
  
    script.forEach((item, index) => {
      if (index % 10 === 0 && index !== 0) {
        groupedScript.push({
          time: `${formatTime(startTime)} - ${formatTime(item.start)}`,
          content: currentGroup.join(' ')
        });
        currentGroup = [];
        startTime = item.start;
      }
      currentGroup.push(item.word);
    });
  
    // Add the last group if there are remaining words
    if (currentGroup.length > 0) {
      groupedScript.push({
        time: `${formatTime(startTime)} - ${formatTime(script[script.length - 1].end)}`,
        content: currentGroup.join(' ')
      });
    }
  
    return groupedScript;
  };

  const scrollToCurrentSegment = useCallback(() => {
    if (tableRef.current && scriptData.length > 0) {
      const currentSegment = scriptData.find(segment => {
        const [start, end] = segment.time.split(' - ').map(t => {
          const [minutes, seconds] = t.split(':').map(Number);
          return minutes * 60 + seconds;
        });
        return currentTime >= start && currentTime < end;
      });
  
      if (currentSegment) {
        const index = scriptData.indexOf(currentSegment);
        const rowHeight = 48; // Adjust this value based on your actual row height
        tableRef.current.scrollTop = index * rowHeight;
      }
    }
  }, [currentTime, scriptData]);

  useEffect(() => {
    scrollToCurrentSegment();
  }, [currentTime, scrollToCurrentSegment]);

  
  const handleSearch = (term: string) => {
    if (!term.trim()) return;
  
    const foundIndex = scriptData.findIndex(segment => 
      segment.content.toLowerCase().includes(term.toLowerCase())
    );
  
    if (foundIndex !== -1 && tableRef.current && playerRef.current) {
      const rowHeight = 48;
      tableRef.current.scrollTop = foundIndex * rowHeight;
  
      // const [startTime] = scriptData[foundIndex].time.split(' - ')[0].split(':').map(Number);
      // playerRef.current?.seekTo(startTime, 'seconds');
    }
  };

  const columns: ColumnDef<GroupedScriptItem>[] = [
    {
      accessorKey: "time",
      header: "Time",
      cell: ({ row }) => {
        const [start, end] = row.original.time.split(' - ').map(t => {
          const [minutes, seconds] = t.split(':').map(Number);
          return minutes * 60 + seconds;
        });
        const isCurrentSegment = currentTime >= start && currentTime < end;
        return (
          <div className={`p-2 ${isCurrentSegment ? 'bg-transparent rounded-md' : ''}`}>
            {row.original.time}
          </div>
        );
      },
    },
    {
      accessorKey: "content",
      header: "Content",
      cell: ({ row }) => {
        const [start, end] = row.original.time.split(' - ').map(t => {
          const [minutes, seconds] = t.split(':').map(Number);
          return minutes * 60 + seconds;
        });
        const isCurrentSegment = currentTime >= start && currentTime < end;
        return (
          <div className={`p-2 ${isCurrentSegment ? 'bg-yellow-50 rounded-md' : ''}`}>
            {row.original.content}
          </div>
        );
      },
    },
  ];

  const handleShuffleNext = useCallback(() => {
    console.log("Shuffling to next card");
    shuffleToNext();
  }, [shuffleToNext]);

  const handleCommandClick = (content: React.ReactNode) => {
    setDialogContent(content);
    setIsDialogOpen(true);
  };

  useEffect(() => {
    setIsClient(true);
    const fetchVoters = async () => {
      const supabase = createClientComponentClient<Database>();
      const { data, error } = await supabase
        .from('voter_records')
        .select('*')
        .order('last_name', { ascending: true });

      if (error) {
        console.error('Error fetching voters:', error);
        return;
      }

      setVoters(data || []);

      // Select a random voter
      if (data && data.length > 0) {
        const randomVoter = data[Math.floor(Math.random() * data.length)];
        setSelectedVoter(randomVoter.id);
      }
    };

    fetchVoters();
  }, []);

  useEffect(() => {
    const fetchCityData = async () => {
      if (!selectedVoter) return;

      const voter = voters.find(v => v.id === selectedVoter);
      if (!voter) return;

      setIsLoading(true);
      const supabase = createClientComponentClient<Database>();
      let { data, error } = await supabase
        .from('cities')
        .select('*')
        .eq('town', voter.city || '')
        .eq('state', voter.state || '')
        .single();

      if (error || !data) {
        // If city data is not found, try to fetch state data
        const { data: stateData, error: stateError } = await supabase
          .from('cities')
          .select('*')
          .is('town', null)
          .eq('state', voter.state || '')
          .single();

        if (stateError) {
          console.error('Error fetching state data:', stateError);
          setIsLoading(false);
          return;
        }

        data = stateData;
      } else {
        error = null;
      }

      if (data) {
        setCityData(data);

        const { queryLocation } = getQueryLocation(data.town || '', data.state);
        setHeaderText(queryLocation);

        const newCardItems = [
          {
            id: 1,
            name: "Demographics",
            designation: "Population Statistics",
            icon: FaUsers,
            content: (
              <>
                <ContentItem icon={FaDollarSign} title="Average Income" content={
                  <span>{data.average_income || 'N/A'} per year</span>
                } />
                <ContentItem icon={FaBabyCarriage} title="Birth Rate" content={
                  <span>{data.birth_rates || 'N/A'}% annual</span>
                } />
              </>
            ),
          },
          {
            id: 2,
            name: "Politics",
            designation: "Political Landscape",
            icon: FaVoteYea,
            content: (
              <div className="space-y-4">
                <ContentItem icon={FaVoteYea} title="Political Leaning" content={
                  <span>{data.party_leanings || 'N/A'}</span>
                } />
                {data.town && (
                  <ContentItem icon={FaUserTie} title="Current Mayor" content={
                    <span>{data.mayor || 'N/A'}</span>
                  } />
                )}
                <ContentItem icon={FaLandmark} title="State Governor" content={
                  <span>{data.state_governor || 'N/A'}</span>
                } />
              </div>
            ),
          },
          {
            id: 3,
            name: "Economy",
            designation: "Economic Factors",
            icon: FaChartLine,
            content: (
              <div className="space-y-4">
                <ContentItem icon={FaChartLine} title="Economic Growth" content={
                  <span>{data.economic_growth || 'N/A'}</span>
                } />
                <ContentItem icon={FaIndustry} title="Key Industries" content={
                  <ul className="list-disc list-inside">
                    {data.relevant_companies?.slice(0, 3).map((company, index) => (
                      <li key={index}>{company}</li>
                    )) || 'N/A'}
                  </ul>
                } />
              </div>
            ),
          },
          {
            id: 4,
            name: "Key Issues",
            designation: "Current Challenges",
            icon: FaExclamationTriangle,
            content: (
              <ContentItem icon={FaExclamationTriangle} title="Top Challenges" content={
                <ul className="list-disc list-inside">
                  {(data.key_issues || []).slice(0, 3).map((issue, index) => (
                    <li key={index}>{issue}</li>
                  ))}
                </ul>
              } />
            ),
          },
        ];

        setCardItems(newCardItems);
        setCards(newCardItems);

        // Set state bill info
        const stateInfo = billsData.states.find(state => state.name === data.state);
        if (stateInfo) {
          setStateBillInfo({
            status: stateInfo.status,
            analysis: stateInfo.analysis
          });
        }
      }

      setIsLoading(false);
    };

    fetchCityData();
  }, [selectedVoter, voters, setCards]);

  useEffect(() => {
    const fetchVoterData = async () => {
      if (!selectedVoter) return;

      setIsLoading(true);
      const supabase = createClientComponentClient<Database>();
      const { data, error } = await supabase
        .from('voter_records')
        .select('*')
        .eq('id', selectedVoter)
        .single();

      if (error) {
        console.error('Error fetching voter data:', error);
        setIsLoading(false);
        return;
      }

      setVoterData(data);
      setIsLoading(false);
    };

    fetchVoterData();
  }, [selectedVoter]);

  useEffect(() => {
    const fetchVideoData = async () => {
      if (!cityData) return;
  
      setIsVideoLoading(true);
      setVideoUrl(null); // Reset video URL
  
      const supabase = createClientComponentClient<Database>();
      const { data, error } = await supabase
        .from('video_map')
        .select('video_url, script')
        .eq('city_id', cityData.id)
        .single();
  
      if (error) {
        console.error('Error fetching video data:', error);
        setIsVideoLoading(false);
        return;
      }
  
      setVideoUrl(data?.video_url || null);
  
      if (data?.script) {
        let parsedScript;
        if (typeof data.script === 'string') {
          try {
            parsedScript = data.script;
          } catch (error) {
            console.error('Error parsing script:', error);
            return;
          }
        } else if (Array.isArray(data.script)) {
          parsedScript = data.script;
        } else {
          console.error('Script data is not in the expected format:', data.script);
          return;
        }
        
        if (Array.isArray(parsedScript)) {
          const groupedScript = groupScriptWords(parsedScript as ScriptItem[]);
          setScriptData(groupedScript);
          console.log('Grouped Script Data:', groupedScript); 
        } else {
          console.error('Parsed script is not an array:', parsedScript);
        }
      }
      
      setIsVideoLoading(false);
    };
  
    fetchVideoData();
  }, [cityData]);

  const handleGenerateVideo = async () => {
    if (!selectedVoter) {
      console.error("No voter selected");
      return;
    }

    setIsGenerating(true);

    try {
      // Check if video already exists for the city
      if (videoUrl) {
        setIsRegeneratingVideo(true);
        // Simulate loading for 1 minute
        await new Promise(resolve => setTimeout(resolve, 60000));
        setIsRegeneratingVideo(false);
        setIsGenerating(false);
        return;
      }

      // Fetch the current voter's data
      const supabase = createClientComponentClient<Database>();
      const { data: voterData, error } = await supabase
        .from('voter_records')
        .select('*')
        .eq('id', selectedVoter)
        .single();

      if (error) {
        throw new Error(`Error fetching voter data: ${error.message}`);
      }

      if (!voterData) {
        throw new Error("No voter data found");
      }

      // Call the ad generation API
      const response = await fetch('/api/ad/generate', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ voterRecord: voterData }),
      });

      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }

      const { ad } = await response.json();

      // Update the video URL with the generated ad
      setVideoUrl(ad.videoUrl);

      // You might also want to update other state variables with the generated ad data
      // For example:
      // setScriptData(groupScriptWords(ad.script));

    } catch (error) {
      console.error('Error generating video:', error);
      // Handle the error appropriately (e.g., show an error message to the user)
    } finally {
      setIsGenerating(false);
    }
  };


  const handleAddToRallyCompliance = () => {
    const scriptContent = scriptData.map(ts => `${ts.time} - ${ts.content}`).join('\n');
    setScript(scriptContent);
    router.push('/compliance');
  };

  const { sources } = sourcesData;

  const truncateText = (text: string, length: number) => {
    if (text.length <= length) return text;
    return text.substring(0, length) + '...';
  };

  return (
      <Navbar onShuffleNext={handleShuffleNext}>
        <main className="min-h-screen px-4 sm:px-8 pt-4 mx-auto max-w-7xl">
          {/* New notice */}
          <div className="mb-6 p-4 bg-blue-50 border-l-4 border-blue-500 rounded-md shadow-sm">
            <p className="text-sm text-blue-800">
              <strong>Educational Purpose Notice:</strong> The AI-generated political media 
              presented here is solely for educational and research purposes. We do not 
              publish or distribute this content for messaging or monetary gain. We are in 
              accordance with state law in Pennsylvania and maintain state-specific 
              compliance with all of the content we generate. Our only goal is to help politicans reach voters that need to know about them and to encourage more civic engagement in elections. 
              <br /><br />
              - With love, Dinesh, Pranav, and Nikita.
            </p>
          </div>

          <div className="mb-6 flex flex-col sm:flex-row items-center justify-between">
            <Select value={selectedVoter || ''} onValueChange={(value) => setSelectedVoter(value)}>
              <SelectTrigger className="py-3 px-4 w-full sm:w-[350px] bg-white shadow-sm hover:bg-gray-50 transition-colors min-h-[50px] flex items-center">
                <SelectValue placeholder="Choose a voter to analyze">
                  {selectedVoter && voters.length > 0 && (
                    <span>
                      {voters.find(voter => voter.id === selectedVoter)?.first_name} {voters.find(voter => voter.id === selectedVoter)?.last_name}
                    </span>
                  )}
                </SelectValue>
              </SelectTrigger>
              <SelectContent className="max-h-[300px] overflow-y-auto">
                {voters.map((voter) => (
                  <SelectItem 
                    key={voter.id} 
                    value={voter.id}
                    className="py-2 px-4 hover:bg-blue-50 cursor-pointer transition-colors"
                  >
                    <div className="flex flex-col py-1 text-left">
                      <span className="font-medium">{`${voter.first_name} ${voter.last_name}`}</span>
                      <span className="text-sm text-gray-500">{`${voter.city}, ${voter.state}`}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* Add the label to the right */}
            <span className="justify-end flex items-center text-gray-500 text-sm mt-2 sm:mt-0">
              <Command className="w-4 h-4 mr-1" />
              Cmd + Click to Focus Section
            </span>
          </div>
          
          <div className="flex flex-col lg:flex-row gap-8">
            <div className="w-full lg:w-2/5 space-y-6">
            <div onClick={(e) => e.metaKey && handleCommandClick(
              <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm blue-shadow">
                <CardContent className="p-4 sm:p-6">
                  <Skeleton isLoading={isLoading} className="h-8 w-3/4 mb-4" />
                  <Skeleton isLoading={isLoading} className="h-6 w-1/2 mb-4" />
                  <Skeleton isLoading={isLoading} className="h-20 w-full mb-4" />
                  <Skeleton isLoading={isLoading} className="h-10 w-1/3" />
                  {!isLoading && voterData && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ duration: 0.5 }}
                      className="space-y-4 sm:space-y-6"
                    >
                      <h2 className="text-xl sm:text-2xl font-semibold text-blue-600">{voterData.first_name} {voterData.last_name}</h2>
                      
                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                        className="grid grid-cols-1 sm:grid-cols-3 gap-4"
                      >
                        <div className="bg-gray-50 p-3 sm:p-4 rounded-lg shadow-sm transition-all hover:shadow-md">
                          <div className="text-center">
                            <p className="text-xs sm:text-sm text-gray-500">Age</p>
                            <p className="font-medium text-sm sm:text-base">{voterData.age || 'N/A'}</p>
                          </div>
                        </div>
                        <div className="bg-gray-100 p-3 sm:p-4 rounded-lg shadow-sm transition-all hover:shadow-md">
                          <div className="text-center">
                            <p className="text-xs sm:text-sm text-gray-500">Location</p>
                            <p className="font-medium text-sm sm:text-base">{`${voterData.city}, ${voterData.state}`}</p>
                          </div>
                        </div>
                        <div className="bg-gray-200 p-3 sm:p-4 rounded-lg shadow-sm transition-all hover:shadow-md">
                          <div className="text-center">
                            <p className="text-xs sm:text-sm text-gray-500">Party Affiliation</p>
                            <div className="flex items-center justify-center">
                              {voterData.party_affiliation && (
                                <PartyIcon party={voterData.party_affiliation as Party} className="w-4 h-4 sm:w-5 sm:h-5 mr-1 sm:mr-2" />
                              )}
                              <p className="font-medium text-sm sm:text-base">{voterData.party_affiliation || 'N/A'}</p>
                            </div>
                          </div>
                        </div>
                      </motion.div>

                      <motion.div
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.4 }}
                        className="space-y-4"
                      >
                        <div>
                          <h3 className="text-sm sm:text-md text-gray-500 font-normal mb-2">Donations</h3>
                          <div className="space-y-4">
                            <DonationList items={voterData.campaigns_donated_to} type="campaign" />
                            <DonationList items={voterData.nonprofits_donated_to} type="nonprofit" />
                          </div>
                        </div>
                      </motion.div>
                    </motion.div>
                  )}
                </CardContent>
              </Card>
            )}>
              <AnimatedHeader title="Voter Profile" subtitle="Personal and political insights" />
              <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm blue-shadow">
                <CardContent className="p-4 sm:p-6">
                    <Skeleton isLoading={isLoading} className="h-8 w-3/4 mb-4" />
                    <Skeleton isLoading={isLoading} className="h-6 w-1/2 mb-4" />
                    <Skeleton isLoading={isLoading} className="h-20 w-full mb-4" />
                    <Skeleton isLoading={isLoading} className="h-10 w-1/3" />
                    {!isLoading && voterData && (
                      <motion.div
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        transition={{ duration: 0.5 }}
                        className="space-y-6"
                      >
                        <h2 className="text-2xl font-semibold text-blue-600">{voterData.first_name} {voterData.last_name}</h2>
                        
                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.2 }}
                          className="flex flex-col sm:flex-row justify-between space-y-4 sm:space-y-0 sm:space-x-4"
                        >
                          <div className="bg-gray-50 p-4 rounded-lg shadow-sm transition-all hover:shadow-md flex-1">
                            <div className="text-center">
                              <p className="text-sm text-gray-500">Age</p>
                              <p className="font-medium">{voterData.age || 'N/A'}</p>
                            </div>
                          </div>
                          <div className="bg-gray-100 p-4 rounded-lg shadow-sm transition-all hover:shadow-md flex-1">
                            <div className="text-center">
                              <p className="text-sm text-gray-500">Location</p>
                              <p className="font-medium">{`${voterData.city}, ${voterData.state}`}</p>
                            </div>
                          </div>
                          <div className="bg-gray-200 p-4 rounded-lg shadow-sm transition-all hover:shadow-md flex-1">
                            <div className="text-center">
                              <p className="text-sm text-gray-500">Party Affiliation</p>
                              <div className="flex items-center justify-center">
                                {voterData.party_affiliation && (
                                  <PartyIcon party={voterData.party_affiliation as Party} className="w-5 h-5 mr-2" />
                                )}
                                <p className="font-medium">{voterData.party_affiliation || 'N/A'}</p>
                              </div>
                            </div>
                          </div>
                        </motion.div>

                        <motion.div
                          initial={{ opacity: 0, y: 20 }}
                          animate={{ opacity: 1, y: 0 }}
                          transition={{ delay: 0.4 }}
                          className="space-y-4"
                        >
                          <div>
                            <h3 className="text-md text-gray-500 font-normal mb-2">Donations</h3>
                            <div className="flex flex-col md:flex-row space-y-2 md:space-y-0 md:space-x-4">
                              <div className="flex-1">
                                <DonationList items={voterData.campaigns_donated_to} type="campaign" />
                                <DonationList items={voterData.nonprofits_donated_to} type="nonprofit" />
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      </motion.div>
                    )}
                  </CardContent>
                </Card>
              </div>

              <div onClick={(e) => e.metaKey && handleCommandClick(
                <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm blue-shadow">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-center mb-6">
                      <Skeleton isLoading={isLoading} className="h-8 w-2/3">
                        <motion.h1 
                          className="text-2xl font-normal text-blue-600"
                          initial={{ y: -20 }}
                          animate={{ y: 0 }}
                          transition={{ type: "spring", stiffness: 300 }}
                        >
                          {headerText}
                        </motion.h1>
                        <div className="bg-blue-50 text-blue-800 w-full sm:w-auto border border-blue-200 text-xs font-medium rounded-md mt-2 sm:mt-0 px-2 py-1 flex items-center justify-center sm:justify-start">
                        <span className="mr-1 hidden sm:inline">⌘</span>
                        <span className="sm:hidden">Tap</span>
                        <span className="hidden sm:inline">J</span>
                        <span className="ml-1">to Flip Through</span>
                      </div>
                      </Skeleton>
                    </div>
                    <Skeleton isLoading={isLoading} className="h-[400px]">
                      <CardStack 
                        items={cardItems} 
                        offset={5} 
                        scaleFactor={0.03} 
                        cards={cards} 
                        setCards={setCards} 
                      />               
                    </Skeleton>
                  </CardContent>
                </Card>
              )}>
                <div className="flex flex-col sm:flex-row items-start sm:items-center mb-2 space-y-2 sm:space-y-0 sm:space-x-2">
                  <AnimatedHeader title="Location Profile" subtitle="Demographic and political insights" />
                </div>
                <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm blue-shadow">
                  <CardContent className="p-6">
                    <div className="flex justify-between items-center mb-6">
                      <Skeleton isLoading={isLoading} className="h-8 w-2/3">
                        <motion.h1 
                          className="text-2xl font-normal text-blue-600"
                          initial={{ y: -20 }}
                          animate={{ y: 0 }}
                          transition={{ type: "spring", stiffness: 300 }}
                        >
                          {headerText}
                        </motion.h1>
                      </Skeleton>
                      <div className="bg-blue-50 text-blue-800 w-full sm:w-auto border border-blue-200 text-xs font-medium rounded-md mt-2 sm:mt-0 px-2 py-1 flex items-center justify-center sm:justify-start">
                        <span className="mr-1 hidden sm:inline">⌘</span>
                        <span className="sm:hidden">Tap</span>
                        <span className="hidden sm:inline">J</span>
                        <span className="ml-1">to Flip Through</span>
                      </div>
                    </div>
                    <Skeleton isLoading={isLoading} className="h-[400px]">
                      <CardStack 
                        items={cardItems} 
                        offset={5} 
                        scaleFactor={0.03} 
                        cards={cards} 
                        setCards={setCards} 
                      />               
                    </Skeleton>
                  </CardContent>
                </Card>
              </div>
              
              <div onClick={(e) => e.metaKey && handleCommandClick(
                <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm blue-shadow">
                  <CardContent className="p-6">
                    <Skeleton isLoading={isLoading} className="h-8 w-3/4 mb-4" />
                    <Skeleton isLoading={isLoading} className="h-6 w-1/2 mb-4" />
                    <Skeleton isLoading={isLoading} className="h-20 w-full mb-4" />
                    <Skeleton isLoading={isLoading} className="h-10 w-1/3" />
                    {!isLoading && stateBillInfo && (
                      <>
                        <h2 className="text-2xl font-normal text-blue-600 mb-4">State of {cityData?.state || 'Unknown State'}</h2>
                        <div className="flex items-center space-x-4 mb-4">
                          <div className={`text-sm font-medium px-3 py-1 rounded-full ${
                            stateBillInfo.status === "ENACTED" ? "bg-green-100 text-green-800" :
                            stateBillInfo.status === "PENDING" ? "bg-yellow-100 text-yellow-800" :
                            "bg-red-100 text-red-800"
                          }`}>
                            {stateBillInfo.status}
                          </div>
                          <span className="text-gray-600">in {cityData?.state || 'Unknown State'}</span>
                        </div>
                        <p className="text-gray-700 mb-4">{stateBillInfo.analysis}</p>
                        <Button onClick={() => {
                          window.open('https://www.ncsl.org/technology-and-communication/deceptive-audio-or-visual-media-deepfakes-2024-legislation', '_blank');
                        }} variant="outline" className="text-blue-600 border-blue-600 hover:bg-blue-50">
                          Learn More
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>
              )}>
                <AnimatedHeader title="Legislation Profile" subtitle="AI Political Ads" />
                <Card className="shadow-lg border-0 bg-white/80 backdrop-blur-sm blue-shadow">
                  <CardContent className="p-6">
                    <Skeleton isLoading={isLoading} className="h-8 w-3/4 mb-4" />
                    <Skeleton isLoading={isLoading} className="h-6 w-1/2 mb-4" />
                    <Skeleton isLoading={isLoading} className="h-20 w-full mb-4" />
                    <Skeleton isLoading={isLoading} className="h-10 w-1/3" />
                    {!isLoading && stateBillInfo && (
                      <>
                        <h2 className="text-2xl font-normal text-blue-600 mb-4">State of {cityData?.state || 'Unknown State'}</h2>
                        <div className="flex items-center space-x-4 mb-4">
                          <div className={`text-sm font-medium px-3 py-1 rounded-full ${
                            stateBillInfo.status === "ENACTED" ? "bg-green-100 text-green-800" :
                            stateBillInfo.status === "PENDING" ? "bg-yellow-100 text-yellow-800" :
                            "bg-red-100 text-red-800"
                          }`}>
                            {stateBillInfo.status}
                          </div>
                          <span className="text-gray-600">in {cityData?.state || 'Unknown State'}</span>
                        </div>
                        <p className="text-gray-700 mb-4">{stateBillInfo.analysis}</p>
                        <Button onClick={() => {
                          window.open('https://www.ncsl.org/technology-and-communication/deceptive-audio-or-visual-media-deepfakes-2024-legislation', '_blank');
                        }} variant="outline" className="text-blue-600 border-blue-600 hover:bg-blue-50">
                          Learn More
                        </Button>
                      </>
                    )}
                  </CardContent>
                </Card>
              </div>
            </div>
            
            <div className="w-full lg:w-3/5 space-y-6">
              <div className="flex items-center mb-2 space-x-2">
                <AnimatedHeader title="Advertisement" subtitle="AI-powered content" />
                <Button
                  onClick={handleGenerateVideo}
                  disabled={isGenerating}
                  size="sm"
                  className="text-white bg-blue-400 border-blue-400 hover:bg-blue-300 transition-all duration-200 px-3 py-[18px] mb-2 mt-4 rounded-md shadow-sm"
                >
                  <RefreshCw className={`w-4 h-4 mr-2 ${isGenerating ? 'animate-spin' : ''}`} />
                  {isGenerating ? 'Generating...' : 'Generate Video'}
                </Button>
              </div>
              <div onClick={(e) => e.metaKey && handleCommandClick(
                <Card className="shadow-sm border-0 overflow-hidden bg-white blue-shadow">
                  <CardContent className="p-0">
                    <div className="aspect-video bg-gray-200 relative">
                      {isVideoLoading || isRegeneratingVideo ? (
                        <motion.div 
                          className="absolute inset-0 flex items-center justify-center bg-gray-200"
                          initial={{ opacity: 0 }}
                          animate={{ opacity: 1 }}
                          exit={{ opacity: 0 }}
                        >
                          <motion.div
                            className="w-16 h-16 border-t-4 border-blue-500 border-solid rounded-full"
                            animate={{ rotate: 360 }}
                            transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                          />
                        </motion.div>
                      ) : (
                        isClient && videoUrl && (
                          <ReactPlayer
                            ref={playerRef}
                            url={videoUrl}
                            width="100%"
                            height="100%"
                            playing={isPlaying}
                            controls={true}
                            onPlay={() => setIsPlaying(true)}
                            onPause={() => setIsPlaying(false)}
                            onProgress={handleProgress}
                          />
                        )
                      )}
                    </div>
                  </CardContent>
                </Card>
              )}>
                <Skeleton isLoading={isLoading} className="aspect-video">
                  <Card className="shadow-sm border-0 overflow-hidden bg-white blue-shadow">
                    <CardContent className="p-0">
                      <div className="aspect-video bg-gray-200 relative">
                        {isVideoLoading || isRegeneratingVideo ? (
                          <motion.div 
                            className="absolute inset-0 flex items-center justify-center bg-gray-200"
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                          >
                            <motion.div
                              className="w-16 h-16 border-t-4 border-blue-500 border-solid rounded-full"
                              animate={{ rotate: 360 }}
                              transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                            />
                          </motion.div>
                        ) : (
                          isClient && videoUrl && (
                            <ReactPlayer
                              ref={playerRef}
                              url={videoUrl}
                              width="100%"
                              height="100%"
                              playing={isPlaying}
                              controls={true}
                              onPlay={() => setIsPlaying(true)}
                              onPause={() => setIsPlaying(false)}
                              onProgress={handleProgress}
                            />
                          )
                        )}
                      </div>
                    </CardContent>
                  </Card>
                </Skeleton>
              </div>

              <div className="flex flex-col lg:flex-row gap-6 mt-6">
                <div className="w-full">
                  <div onClick={(e) => e.metaKey && handleCommandClick(
                    <Card className="shadow-sm border-0 bg-white blue-shadow h-full">
                      <CardContent className="p-6">
                        <Skeleton isLoading={isLoading} className="h-[400px]">
                          <div ref={tableRef} className="h-[350px] overflow-y-auto">
                            <DataTable columns={columns} data={scriptData} onSearch={handleSearch}/>
                          </div>
                        </Skeleton>
                      </CardContent>
                    </Card>
                  )}>
                    <div className="flex items-center mb-2 space-x-2">
                      <AnimatedHeader title="Video Script" subtitle="Timestamped content" />
                        <Button
                              onClick={handleAddToRallyCompliance}
                              size="sm"
                              className="text-white bg-blue-400 border-blue-400 hover:bg-blue-300 transition-all duration-200 px-3 py-[18px] mb-2 mt-4 rounded-md shadow-sm"
                            >
                              <LayoutDashboard className="w-4 h-4 mr-2 text-white" />
                              Add to Rally Compliance
                            </Button>
                    </div>
                    <Card className="shadow-sm border-0 bg-white blue-shadow h-full">
                      <CardContent className="p-6">
                        <Skeleton isLoading={isLoading} className="h-[400px]">
                          <div ref={tableRef} className="h-[350px] overflow-y-auto">
                            <DataTable columns={columns} data={scriptData} onSearch={handleSearch} />
                          </div>
                        </Skeleton>
                      </CardContent>
                    </Card>
                  </div>
                </div>
              </div>

              <div className="w-full mt-6">
                <div onClick={(e) => e.metaKey && handleCommandClick(
                  <Card className="shadow-sm border-0 bg-white blue-shadow h-full">
                    <CardContent className="p-6">
                      <Skeleton isLoading={isLoading} className="h-[400px]">
                        <div className="space-y-4 overflow-y-auto max-h-[400px]">
                          {sources.map((source, index) => (
                            <div key={index} className="flex flex-col sm:flex-row items-center space-y-4 sm:space-y-0 sm:space-x-4 p-3 bg-gray-50 rounded-lg transition-all hover:shadow-md">
                              <div className="flex-shrink-0">
                                <Image
                                  src={source.thumbnail}
                                  alt={source.title}
                                  width={80}
                                  height={60}
                                  className="rounded-md object-cover"
                                />
                              </div>
                              <div className="flex-grow text-center sm:text-left">
                                <h4 className="text-sm font-semibold text-gray-800">{source.title}</h4>
                                <p className="text-xs text-gray-600">
                                  {truncateText(source.description, 30)}
                                  {source.description.length > 30 && (
                                    <span className="text-blue-500 cursor-pointer"> show more</span>
                                  )}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </Skeleton>
                    </CardContent>
                  </Card>
                )}>
                  <AnimatedHeader title="Sources" subtitle="Information references" />
                  <Card className="shadow-sm border-0 bg-white blue-shadow h-full">
                    <CardContent className="p-6">
                      <Skeleton isLoading={isLoading} className="h-[400px]">
                        <div className="overflow-x-auto">
                          <div className="flex space-x-4 pb-4">
                            {sources.map((source, index) => (
                              <div key={index} className="flex-shrink-0 w-64 bg-gray-50 rounded-lg transition-all hover:shadow-md">
                                <div className="p-3">
                                  <Image
                                    src={source.thumbnail}
                                    alt={source.title}
                                    width={80}
                                    height={60}
                                    className="rounded-md object-cover w-full h-40 mb-3"
                                  />
                                  <h4 className="text-sm font-semibold text-gray-800 mb-1">{source.title}</h4>
                                  <p className="text-xs text-gray-600">
                                    {truncateText(source.description, 50)}
                                    {source.description.length > 50 && (
                                      <span className="text-blue-500 cursor-pointer ml-1">show more</span>
                                    )}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      </Skeleton>
                    </CardContent>
                  </Card>
                </div>
              </div>
            </div>
          </div>
        </main>

        <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
          <DialogContent className="bg-white">
            {dialogContent}
          </DialogContent>
        </Dialog>
      </Navbar>
  );
}
const ContentItem = ({ title, content, icon: Icon }: { title: string; content: React.ReactNode; icon?: IconType }) => (
  <div className="mb-4 p-4 bg-gray-50 rounded-lg shadow-sm transition-all hover:shadow-md">
    <div className="flex items-center mb-2">
      {Icon && <Icon className="w-5 h-5 mr-2 text-blue-500" />}
      <h4 className="text-sm font-semibold text-gray-800">{title}</h4>
    </div>
    <div className="text-sm text-gray-600">{content}</div>
  </div>
);

const DonationList = ({ items, type }: { items: string[] | null; type: 'campaign' | 'nonprofit' }) => (
  <div className="mt-2 w-full">
    {items && items.length > 0 ? (
      <ul className="space-y-2 w-full">
        {items.map((item, index) => (
          <li key={index} className="flex items-center w-full">
            <Badge variant="outline" className={`w-20 mr-2 flex-shrink-0 ${type === 'campaign' ? 'bg-blue-100' : 'bg-green-100'}`}>
              {type === 'campaign' ? 'Campaign' : 'Nonprofit'}
            </Badge>
            <div className="flex-1 min-w-0 overflow-hidden">
              <span className="text-sm block truncate">{item}</span>
            </div>
          </li>
        ))}
      </ul>
    ) : (
      <p className="text-sm text-gray-500 italic">No donations recorded</p>
    )}
  </div>
);

export default function WrapperHome() {
  return (
    <ScriptProvider>
      <Home />
    </ScriptProvider>
  );
}

