"use client";
import { useState, useEffect } from "react";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { ScrollArea } from "@/components/ui/scroll-area";
import Navbar from "@/components/nav/Navbar";
import dynamic from 'next/dynamic';
import { createClientComponentClient } from "@supabase/auth-helpers-nextjs";
import { Database } from "@/lib/types/schema";
import { getQueryLocation } from "@/lib/cityUtils";

const ReactPlayer = dynamic(() => import('react-player'), { ssr: false });

export default function Home() {
  const [cityData, setCityData] = useState<Database['public']['Tables']['cities']['Row'] | null>(null);
  const [headerText, setHeaderText] = useState<string>("");
  const [isPlaying, setIsPlaying] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
    const fetchCityData = async () => {
      const supabase = createClientComponentClient<Database>();
      const { data, error } = await supabase
        .from('cities')
        .select('*')
        .limit(1)
        .single();

      if (error) {
        console.error('Error fetching city data:', error);
        return;
      }

      setCityData(data);

      if (data) {
        const { queryLocation } = getQueryLocation(data.town || '', data.state);
        setHeaderText(queryLocation);
      }
    };

    fetchCityData();
  }, []);

  const timestamps = [
    { time: "00:05", content: `Welcome to ${headerText}` },
    { time: "00:10", content: `Home to ${cityData?.average_income || 'many'} residents` },
    { time: "00:15", content: cityData?.party_leanings || 'Diverse political views' },
    // ... other timestamps
  ];

  const filteredTimestamps = timestamps.filter(
    (stamp) => stamp.content.toLowerCase().includes(searchQuery.toLowerCase())
  );

  if (!cityData) {
    return <div>Loading...</div>;
  }

  return (
    <Navbar>
      <main className="bg-neutral-100 min-h-screen p-8">
        <div className="flex flex-col md:flex-row gap-8">
          <div className="w-full md:w-1/3 space-y-8">
            <Card className="shadow-sm border-0 bg-white">
              <CardContent className="p-6">
                <h1 className="text-2xl font-semibold text-blue-500 mb-4">{headerText}</h1>
                <div className="space-y-4">
                  {cityData.mayor && (
                    <p className="text-gray-700"><strong>Mayor:</strong> {cityData.mayor}</p>
                  )}
                  {cityData.average_income && (
                    <p className="text-gray-700"><strong>Average Income:</strong> {cityData.average_income}</p>
                  )}
                  {cityData.party_leanings && (
                    <p className="text-gray-700"><strong>Political Leaning:</strong> {cityData.party_leanings}</p>
                  )}
                  {cityData.key_issues && cityData.key_issues.length > 0 && (
                    <div>
                      <strong className="text-gray-700">Key Issues:</strong>
                      <ul className="list-disc list-inside ml-4">
                        {cityData.key_issues.map((issue, index) => (
                          <li key={index} className="text-gray-600">{issue}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>
          <div className="flex-1 space-y-8">
            <Card className="shadow-sm border-0 overflow-hidden bg-white">
              <CardContent className="p-0">
                <div className="aspect-video bg-gray-200 relative">
                  {isClient && (
                    <ReactPlayer
                      url="https://www.youtube.com/watch?v=dQw4w9WgXcQ"
                      width="100%"
                      height="100%"
                      playing={isPlaying}
                      controls={true}
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                    />
                  )}
                </div>
              </CardContent>
            </Card>
            <Card className="shadow-sm border-0 bg-white">
              <CardContent className="p-6">
                <div className="mb-4">
                  <Input
                    placeholder="Search timestamps..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="w-full"
                  />
                </div>
                <ScrollArea className="h-[300px] w-full rounded-md border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead className="w-[100px]">Time</TableHead>
                        <TableHead>Content</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredTimestamps.map((stamp, index) => (
                        <TableRow key={index}>
                          <TableCell className="font-medium">{stamp.time}</TableCell>
                          <TableCell>{stamp.content}</TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </Navbar>
  );
}
