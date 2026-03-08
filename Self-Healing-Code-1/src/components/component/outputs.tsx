"use client"
import { useState } from 'react';
import { CardContent, Card } from '@/components/ui/card';
import { TerminalIcon } from 'lucide-react';
import ChipTabs from './chips';
import ReactMarkdown from "react-markdown";
import axios from 'axios';
import { Editor } from '@monaco-editor/react';
import { Button } from '../ui/button';
import toast from 'react-hot-toast';
export function OutputChips({ code, inputSchema, outputSchema, lang }: { code: string, inputSchema: {}, outputSchema: {}, lang: string }) {
  const [activeTab, setActiveTab] = useState('Test Cases');
  const [codeExplanation, setCodeExplanation] = useState('');
  const [generatedTestCases, setGeneratedTestCases] = useState('');
  const [runOutput, setRunOutput] = useState({})
  const [humanReadableOutput, setHumanReadableOutput] = useState();
  const [loading, setLoading] = useState(false);
  const [running, setRunning] = useState(false);
  const [generating, setGenerating] = useState(false);

  const handleGenerateTestCase = async () => {
    try {
      setGenerating(true);
      toast.success("Generating TestCase")
      const response = await axios.get(`/api/test?code=${encodeURIComponent(code)}`);
      const data = await response.data;

      setGeneratedTestCases(data.code);
    } finally {
      toast.success("Generated TestCase")
      setGenerating(false);
    }
  };

  const handleRunTestCase = async () => {
    try {
      setRunning(true);
      toast.success("Running Tests")
      const response = await axios.get(`/api/run?code=${encodeURIComponent(generatedTestCases)}&language=${lang || "python"}`);

      const result = await response.data;
      // show rhe result json in a text box below the buttons div
      setRunOutput(result);
      toast.success("Got results, Making it Human readable...")

      const response2 = await axios.get(`/api/default?query=${encodeURIComponent(JSON.stringify(result) + " Please summarize the output for me. This was for test case:" + generatedTestCases)}`)
      setHumanReadableOutput(response2.data.message);
    } finally {
      setRunning(false);
      toast.success("Ran Succussfully")
    }
  };

  const generateCodeExplanation = async () => {
    try {
      toast.success("Generating Explainations...")
      setLoading(true);
      const response = await axios.get(`/api/explain?code=${encodeURIComponent(code)}&inputSchema=${inputSchema}&outputSchema=${outputSchema}`);
      const data = await response.data;
      setCodeExplanation(data.explaination);
    }
    finally {
      setLoading(false);
      toast.success("Generated Explainations.")
    }
  };

  return (
    <div className="bg-white p-2 h-full overflow-y-auto ">

      <div className="flex items-center space-x-4 mb-6 min-w-[300px]">
        <TerminalIcon className="text-black" />
      </div>
      <div className="flex flex-col space-y-4">
        <div className="flex space-x-2">
          <ChipTabs setSelectedTab={setActiveTab} />
        </div>

        {activeTab === "Test Cases" && (


          <div>
            <Card className="rounded-lg">
              <CardContent>
                <div className="flex flex-col space-x-2  items-center">
                  <label className="text-sm font-medium mb-2" htmlFor="codeExplanation">
                    Generate Test Case:
                  </label>
                  <Editor className='min-h-[25vh] border-2' value={generatedTestCases} />

                  <div className='flex gap-4 mt-4 mb-4'>
                    <Button
                      onClick={handleGenerateTestCase}
                      className="bg-blue-500 text-white px-4 py-2 cursor-pointer rounded mt-4 bg-gradient-to-r from-violet-600 to-indigo-600"
                      disabled={generating}
                    >
                      {generating ? 'Generating...' : 'Generate'}
                    </Button>
                    <Button
                      onClick={handleRunTestCase}
                      className="bg-blue-500 text-white px-4 py-2 rounded cursor-pointer mt-4 bg-gradient-to-r from-violet-600 to-indigo-600"
                      disabled={generatedTestCases.length < 1 || running}
                    >
                      {running ? 'Running...' : 'Run'}
                    </Button>
                  </div>
                  <ReactMarkdown className="w-full h-full">{humanReadableOutput || ""}</ReactMarkdown>
                </div>
              </CardContent>
            </Card>
          </div>

        )}
        {activeTab === "Code Explanation" && (
          <div className=''>
            <Card className="rounded-lg">
              <CardContent>
                <div className="flex flex-col space-x-2  items-center">
                  <label className="text-sm font-medium mb-2" htmlFor="codeExplanation">
                    Code Explanation:
                  </label>
                  <ReactMarkdown
                    className="border-gray-300 border  p-2 flex-grow w-full min-h-[20vh]"
                  >
                    {codeExplanation}
                  </ReactMarkdown>
                  <button
                    className=" text-white px-4 py-2 rounded mt-4 bg-gradient-to-r from-violet-600 to-indigo-600"
                    onClick={generateCodeExplanation}
                    disabled={loading}
                  >
                    {loading ? 'Generating...' : 'Generate'}
                  </button>
                </div>
              </CardContent>
            </Card>
          </div>
        )}

      </div>
    </div >
  );
}
