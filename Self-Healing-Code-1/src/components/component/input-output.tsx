import { Textarea } from "@/components/ui/textarea"
import { Label } from "../ui/label"

export default function InputOutput({ inputRef, outputRef }: { inputRef: any, outputRef: any }) {
    return (
        <>
        <div className="absolute inset-0 -z-10 h-full w-full bg-white bg-[radial-gradient(#bdbdbd_1.5px,transparent_1.5px)] [background-size:16px_16px]"></div>
                <div className="absolute bottom-auto -z-10 left-auto right-0 top-12 h-[500px] w-[500px] -translate-x-[30%] translate-y-[20%] rounded-full bg-[rgba(173,109,244,0.5)] opacity-50 blur-[80px]"></div>
            <div className="bg-white h-full p-8">
                
                <div className="mt-8">
                    <div className=" gap-4">
                        <div>
                            <Label className=" flex flex-col text-sm font-medium " htmlFor="input">
                                Input JSON
                            </Label>
                            <Textarea className="min-h-32" id="input" ref={inputRef} placeholder="Enter input JSON here" />
                        </div>
                        <div>
                            <Label className="text-sm font-medium" htmlFor="output">
                                Output JSON
                            </Label>
                            <Textarea className="min-h-32" ref={outputRef} id="output" placeholder="Output JSON will be displayed here" />
                        </div>
                    </div>
                </div>
            </div>
        </>

    )
}