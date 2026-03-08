import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import Link from "next/link"
import dynamic from "next/dynamic";


const DialogDemo= () => {
  return (
    <Dialog defaultOpen>
      <DialogContent className="min-w-[560px]">
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
            <div className="mb-4">
              <label className="block text-sm font-medium mb-1" htmlFor="output-schema">
                Output Schema
              </label>
              <Textarea id="output-schema" placeholder="Output schema" />
            </div>
            <div className="flex justify-end mt-4">
              <Link href="/dashboard">
                <Button>Generate</Button>
              </Link>
            </div>
          </form>
        </div>
      </DialogContent>
    </Dialog>
  )
}
export default dynamic (() => Promise.resolve(DialogDemo), {ssr: false})
