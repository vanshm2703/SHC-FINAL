import { Button } from "@/components/ui/button";
import * as DialogPrimitive from "@radix-ui/react-dialog";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import Link from "next/link";
import dynamic from "next/dynamic";
import { X } from "lucide-react";
const DialogClose = DialogPrimitive.Close;

const Modal = ({
    onGeneratePressed,
}: {
    onGeneratePressed: (prompt: string, inputSchema: string, outputSchema: string, dataSources: string) => void;
}) => {
    const handleGenerateClick = () => {
        const prompt = document.getElementById("prompt") as HTMLInputElement;
        const negetivePrompt = document.getElementById("negative-prompt") as HTMLInputElement;
        const inputSchema = document.getElementById("input-schema") as HTMLInputElement;
        const outputSchema = document.getElementById("output-schema") as HTMLInputElement;
        const dataSources = document.getElementById("data-sources") as HTMLInputElement;

        if (prompt && inputSchema && outputSchema && dataSources) {
            onGeneratePressed(prompt.value + " Without the following things: " + negetivePrompt.value, inputSchema.value, outputSchema.value, dataSources.value);
        }
    };

    return (
        <Dialog defaultOpen>
            <DialogContent className="min-w-[560px] bg-white">
                <DialogHeader>
                    <DialogTitle>Let's Get started</DialogTitle>
                    <DialogDescription>
                        Click Generate to Unlock Dynamic Editor and Generate Functions On-the-Fly!
                    </DialogDescription>
                </DialogHeader>
                <div className="bg-white rounded-md shadow p-6" style={{ width: "32rem" }}>
                    <form>
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-1" htmlFor="prompt">
                                Prompt
                            </label>
                            <Input id="prompt" placeholder="Describe the data you want to generate" />
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-1" htmlFor="negative-prompt">
                                Negative Prompt
                            </label>
                            <Input id="negative-prompt" placeholder="A prompt that describes what to avoid" />
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-1" htmlFor="data-sources">
                                Data Sources
                            </label>
                            <Input id="data-sources" placeholder="Table names (Comma separated)" />
                        </div>
                        <div className="mb-4">
                            <label className="block text-sm font-medium mb-1" htmlFor="input-schema">
                                Input Schema
                            </label>
                            <Textarea id="input-schema" placeholder="Input schema" />
                        </div>
                        <div className="mb-10">
                            <label className="block text-sm font-medium mb-1" htmlFor="output-schema">
                                Output Schema
                            </label>
                            <Textarea id="output-schema" placeholder="Output schema" />
                        </div>
                        <div className="flex justify-end mt-4">
                            <Link href="/dashboard">
                                <DialogPrimitive.Close className="absolute right-12 bottom-9   focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2 disabled:pointer-events-none data-[state=open]:bg-accent data-[state=open]:text-muted-foreground">
                                    <Button className="bg-black text-white" onClick={handleGenerateClick}>Generate</Button>
                                    <span className="sr-only">Close</span>
                                </DialogPrimitive.Close>
                            </Link>
                        </div>
                    </form>
                </div>
            </DialogContent>
        </Dialog>
    );
};

export default dynamic(() => Promise.resolve(Modal), { ssr: false });
