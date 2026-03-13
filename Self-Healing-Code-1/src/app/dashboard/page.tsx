"use client";
import { InputChips } from "@/components/component/inputs"
import { VersionControl } from "@/components/component/version-control"
import {
  ResizableHandle,
  ResizablePanel,
  ResizablePanelGroup,
} from "@/components/ui/resizable"
import { useRef, useState } from "react"
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import axios from "axios";
import { useAuth } from "@/context/AuthContext";
import { Editor } from "@monaco-editor/react";
import Modal from "@/components/component/modal";
import { driver } from "driver.js";
import "driver.js/dist/driver.css";

import { OutputChips } from "@/components/component/outputs";
import toast from "react-hot-toast";

export default function Dashboard() {

  const [lang, setLang] = useState<string>("");
  const [code, setCode] = useState<string>("");
  const auth = useAuth();
  const refinePromptRef = useRef<HTMLInputElement | null>(null);
  const inputSchemaRef = useRef<HTMLInputElement | null>(null);
  const outputSchemaRef = useRef<HTMLInputElement | null>(null);
  const dataSourcesRef = useRef<HTMLInputElement | null>(null);


  const onGeneratePressed = async (prompt: string, inputSchema: string, outputSchema: string, dataSources: string) => {
    try {
      // Validate inputs
      if (!prompt?.trim() || !inputSchema?.trim() || !outputSchema?.trim()) {
        toast.error("Please fill in all required fields: Prompt, Input Schema, and Output Schema");
        return;
      }

      toast.loading("Generating top quality code.... Be patient", {
        duration: 5000
      })
      // @ts-ignore
      refinePromptRef.current.value = prompt;
      // @ts-ignore
      inputSchemaRef.current.value = inputSchema;
      // @ts-ignore
      outputSchemaRef.current.value = outputSchema;
      // @ts-ignore
      dataSourcesRef.current.value = dataSources;

      const URL = `/api/code?changes=${encodeURIComponent(prompt)}&inputSchema=${encodeURIComponent(inputSchema)}&outputSchema=${encodeURIComponent(outputSchema)}&dataSources=${encodeURIComponent(dataSources || '')}`
      const response = await axios.get(URL);
      console.log(response.data)
      
      // Extract values from response
      const generatedLanguage = response.data.language;
      const generatedCode = response.data.code;
      
      // Update state with new values
      setLang(generatedLanguage);
      setCode(generatedCode);

      toast.success("Generated Code")

      // Save to MongoDB history (separate try-catch so code generation doesn't fail if history save fails)
      try {
        const historyData = {
          userId: auth?.user?.uid,
          code: generatedCode,
          prompt: prompt,
          pfp: auth?.user?.photoURL,
          schema: { input: inputSchema, output: outputSchema },
          language: generatedLanguage,
          dataSources: dataSources
        };

        const historyResponse = await axios.post("/api/history", historyData);
        console.log("History saved:", historyResponse.data);
      } catch (historyError: any) {
        console.error("Warning: Failed to save history:", historyError);
        // Don't show error to user - history save failure shouldn't block code generation
        console.log("History save failed but code generation succeeded");
      }
    } catch (error: any) {
      console.error("Error in onGeneratePressed:", error);
      toast.error(`Error: ${error.response?.data?.error || error.message || "Failed to generate code"}`);
    }
  }

  const onRefinePressed = async () => {
    try {
      // Check if code exists
      if (!code || code.trim() === "") {
        toast.error("Please generate code first before refining");
        return;
      }

      // Check if refine prompt is provided
      const refinePrompt = refinePromptRef.current?.value?.trim();
      if (!refinePrompt) {
        toast.error("Please enter a refine prompt");
        return;
      }

      const URL = `/api/refine?code=${encodeURIComponent(code || '')}&changes=${encodeURIComponent(refinePrompt)}&inputSchema=${encodeURIComponent(inputSchemaRef.current?.value || '')}&outputSchema=${encodeURIComponent(outputSchemaRef.current?.value || '')}&dataSources=${encodeURIComponent(dataSourcesRef.current?.value || '')}`
      
      console.log("Refine URL:", URL);
      console.log("Refine Parameters - Code length:", code.length, "Changes:", refinePrompt);
      
      // Create the API request promise
      const refinePromise = axios.get(URL).then((response) => {
        console.log("Refine response:", response.data);
        return response.data;
      });

      // Use toast.promise for better async handling
      const result = await toast.promise(
        refinePromise,
        {
          loading: 'Refining your code...',
          success: 'Code refined successfully! ✨',
          error: 'Failed to refine code'
        }
      );

      // Extract values from response
      const refinedLanguage = result.language;
      const refinedCode = result.code;
      
      // Update state with new values
      setLang(refinedLanguage);
      setCode(refinedCode);

      // Clear the refine prompt input
      if (refinePromptRef.current) {
        refinePromptRef.current.value = "";
      }

      // Save to MongoDB history (non-blocking)
      try {
        const historyData = {
          userId: auth?.user?.uid,
          code: refinedCode,
          prompt: refinePrompt,
          pfp: auth?.user?.photoURL,
          schema: { input: inputSchemaRef.current?.value, output: outputSchemaRef.current?.value },
          language: refinedLanguage,
          dataSources: dataSourcesRef.current?.value
        };

        axios.post("/api/history", historyData).catch((err) => {
          console.error("Warning: Failed to save history:", err);
        });
      } catch (historyError: any) {
        console.error("Warning: Failed to save history:", historyError);
      }
    } catch (error: any) {
      console.error("Error in onRefinePressed:", error);
      // Toast error is already shown by toast.promise
    }
  }

  function handleEditorChange(value: any, event: any) {
    setCode(value);
  }

  const exportToVSCode = () => {
    const content = code;
    if (content) {
      const blob = new Blob([content], { type: "application/octet-stream" });
      const a = document.createElement("a");
      document.body.appendChild(a);
      a.setAttribute("style", "display: none");
      const url = window.URL.createObjectURL(blob);
      a.href = url;
      a.download = "exported_code";
      a.click();
      document.body.removeChild(a);
      window.open("vscode://file/C:/Users/sujal/Downloads/exported_code");
      window.open("vscode://file/C:/Users/sujal/Downloads/exported_code");
    }
  };

  return (
    <>

      <Modal onGeneratePressed={onGeneratePressed} />
      <ResizablePanelGroup
        direction="horizontal"
        className="w-full rounded-lg border"
      >
        <ResizablePanel defaultSize={15} maxSize={25} minSize={15}>
          <div id="versioncontrol" className=" h-full border-2 ">
            <VersionControl

              setCode={setCode}
              setLang={setLang}
              inputRef={inputSchemaRef}
              outputRef={outputSchemaRef}
              dataSources={dataSourcesRef}
              prompt={refinePromptRef}
            />
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={80}>
          <div id="editor" className="h-full flex flex-col bg-white">
            <button id="export" onClick={exportToVSCode} className="absolute top-6 z-30 left-14 group relative text-sm inline-flex h-8 w-12 items-center justify-center overflow-hidden rounded-full bg-neutral-950 font-medium text-neutral-200 transition-all duration-300 hover:w-48"><div className="inline-flex whitespace-nowrap text-sm opacity-0 transition-all duration-200 group-hover:-translate-x-3 group-hover:opacity-100">Export to VS CODE</div><div className="absolute right-3.5"><svg width="15" height="15" viewBox="0 0 15 15" fill="none" xmlns="http://www.w3.org/2000/svg" className="h-5 w-5"><path d="M8.14645 3.14645C8.34171 2.95118 8.65829 2.95118 8.85355 3.14645L12.8536 7.14645C13.0488 7.34171 13.0488 7.65829 12.8536 7.85355L8.85355 11.8536C8.65829 12.0488 8.34171 12.0488 8.14645 11.8536C7.95118 11.6583 7.95118 11.3417 8.14645 11.1464L11.2929 8H2.5C2.22386 8 2 7.77614 2 7.5C2 7.22386 2.22386 7 2.5 7H11.2929L8.14645 3.85355C7.95118 3.65829 7.95118 3.34171 8.14645 3.14645Z" fill="currentColor" fill-rule="evenodd" clip-rule="evenodd"></path></svg></div></button>
            <div className="flex-1 overflow-auto pt-4">
              <Editor
                height="100%"
                defaultLanguage={lang}
                language={lang}
                theme="light"
                defaultValue={code}
                value={code}
                onChange={handleEditorChange}
              />
            </div>

            <div id="refine" className="flex flex-row justify-center bg-white items-center space-x-3 px-4 py-4 border-t">
              <span className="flex-1">
                <Input ref={refinePromptRef} className="rounded-lg bg-white text-sm" placeholder="Refine your code..." /> 
              </span>
              <Button onClick={onRefinePressed} className="group relative inline-flex h-10 items-center justify-center overflow-hidden rounded-xl bg-neutral-950 px-6 font-medium text-neutral-200 transition hover:scale-105"><span>Refine</span>
                <div className="absolute inset-0 flex h-full w-full justify-center [transform:skew(-12deg)_translateX(-100%)] group-hover:duration-1000 group-hover:[transform:skew(-12deg)_translateX(100%)]"><div className="relative h-full w-8 bg-white/20"></div></div>
              </Button>
            </div>
          </div>
        </ResizablePanel>
        <ResizableHandle withHandle />
        <ResizablePanel defaultSize={35} minSize={25} maxSize={45} className="bg-gray-50">
          <ResizablePanelGroup direction="vertical" className="border-0">
            <ResizablePanel defaultSize={50} minSize={20} id="testcases" className="p-2">
              <OutputChips code={code || ""} inputSchema={inputSchemaRef.current?.value || ""} outputSchema={outputSchemaRef.current?.value || ""} lang={lang || "python"} />
            </ResizablePanel>
            <ResizableHandle withHandle className="border-0" />
            <ResizablePanel defaultSize={50} minSize={20} id="input" className="p-2">
              <InputChips inputRef={inputSchemaRef} outputRef={outputSchemaRef} dataSourcesRef={dataSourcesRef} />
            </ResizablePanel>
          </ResizablePanelGroup>
        </ResizablePanel>
      </ResizablePanelGroup>
    </>
  )
}