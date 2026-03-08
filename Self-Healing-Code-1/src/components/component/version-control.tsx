import { Button } from "@/components/ui/button";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useEffect, useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { formatDistanceToNowStrict } from "date-fns"
import axios from "axios";

export function VersionControl({
  setCode,
  setLang,
  inputRef,
  outputRef,
  dataSources,
  prompt
}: {
  setCode: any,
  setLang: any,
  inputRef: any,
  outputRef: any,
  dataSources: any,
  prompt: any
}) {
  const [versionData, setVersionData] = useState<any>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const auth = useAuth();

  useEffect(() => {
    async function getHistory() {
      try {
        setLoading(true);
        setError(null);
        const userId = auth?.user?.uid || 'anonymous';
        console.log("Fetching history for userId:", userId);
        const response = await axios.get(`/api/history?userId=${userId}`);
        console.log("History response:", response.data);
        setVersionData(response.data.records || []);
      } catch (e: any) {
        console.error("Error fetching history:", e.message);
        setError(e.message);
      }
      finally {
        setLoading(false);
      }
    }

    // Fetch history on mount and whenever auth changes
    getHistory();
  }, [auth]);

  async function handleOnVersionChoose(version: any) {
    console.log(version)
    setCode(version.code);
    setLang(version.language)
    prompt.current.value = version.prompt
    inputRef.current.value = version.schema?.input || '';
    outputRef.current.value = version.schema?.output || '';
    if (dataSources?.current) {
      dataSources.current.value = version.dataSources || '';
    }
  }

  return (
    <div className="h-screen p-4 bg-white flex flex-col">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold">History</h2>
        <Button 
          className="text-lg h-8 w-8 p-0" 
          variant="outline"
          onClick={() => {
            const userId = auth?.user?.uid || 'anonymous';
            const getHistory = async () => {
              try {
                setLoading(true);
                setError(null);
                const response = await axios.get(`/api/history?userId=${userId}`);
                setVersionData(response.data.records || []);
              } catch (e: any) {
                setError(e.message);
              }
              finally {
                setLoading(false);
              }
            };
            getHistory();
          }}
        >
          ↻
        </Button>
      </div>
      
      {error && (
        <div className="text-red-500 text-xs p-2 bg-red-50 rounded mb-2 border border-red-200">
          {error}
        </div>
      )}
      
      {loading ? (
        <div className="flex items-center justify-center flex-1 text-gray-400">
          <span>Loading...</span>
        </div>
      ) : versionData && versionData.length > 0 ? (
        <ScrollArea className="flex-1">
          <div className="space-y-2 pr-4">
            {versionData.map((version: any, index: number) => (
              <div 
                key={version._id || index}
                className="p-3 bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-100 rounded-lg cursor-pointer hover:bg-blue-100 transition-all"
                onClick={() => { handleOnVersionChoose(version) }}
              >
                <p className="text-sm font-semibold text-gray-800 truncate">
                  {version.prompt.slice(0, 35)}...
                </p>
                <div className="flex justify-between items-center mt-2">
                  <span className="text-xs font-medium text-blue-600 bg-blue-100 px-2 py-0.5 rounded">
                    {version.language}
                  </span>
                  <span className="text-xs text-gray-500">
                    {formatDistanceToNowStrict(new Date(version.createdAt))} ago
                  </span>
                </div>
              </div>
            ))}
          </div>
        </ScrollArea>
      ) : (
        <div className="flex items-center justify-center flex-1 text-gray-400 text-sm">
          No history yet
        </div>
      )}
    </div>
  );
}
