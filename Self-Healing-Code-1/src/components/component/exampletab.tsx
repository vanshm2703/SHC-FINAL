import Image from "next/image";
import { Tabs } from "../ui/tabs";

export default function TabsDemo() {
  const tabs = [
    {
      title: "Code generation",
      value: "Code generation",
      content: (
        <div className="w-full overflow-hidden relative h-full rounded-2xl p-10 text-xl md:text-4xl font-bold text-white bg-gradient-to-br from-blue-900 to-blue-950">
          <p>Idea to code in seconds. Write it out, we'll build it</p>
          <DummyContent imageSrc="/1.jpg" />
        </div>
      ),
    },
    {
      title: "Prompt optimization",
      value: "Prompt optimization",
      content: (
        <div className="w-full overflow-hidden relative h-full rounded-2xl p-10 text-xl md:text-4xl font-bold text-white bg-gradient-to-br from-blue-900 to-blue-950">
          <p>Write like a pro, code like a prompt perfection</p>
          <DummyContent imageSrc="/1.jpg" />
        </div>
      ),
    },
    {
        title: "Structured I/O",
        value: "Structured I/O",
        content: (
          <div className="w-full overflow-hidden relative h-full rounded-2xl p-10 text-xl md:text-4xl font-bold text-white bg-gradient-to-br from-blue-900 to-blue-950">
            <p>Seamless data flow, clear input, perfect output</p>
            <DummyContent imageSrc="/3.jpg" />
          </div>
        ),
      },
      {
        title: "Pseudo gen",
        value: "",
        content: (
          <div className="w-full overflow-hidden relative h-full rounded-2xl p-10 text-xl md:text-4xl font-bold text-white bg-gradient-to-br from-blue-900 to-blue-950">
            <p>See the logic before the code</p>
            <DummyContent imageSrc="/2.jpg" />
          </div>
        ),
      },
      {
        title: "Version control",
        value: "chat",
        content: (
          <div className="w-full overflow-hidden relative h-full rounded-2xl p-10 text-xl md:text-4xl font-bold text-white bg-gradient-to-br from-blue-900 to-blue-950">
            <p>Experiment fearlessly, iterate effortlessly</p>
            <DummyContent imageSrc="/5.jpg" />
          </div>
        ),
      },
      {
        title: "VS code",
        value: "VS code",
        content: (
          <div className="w-full overflow-hidden relative h-full rounded-2xl p-10 text-xl md:text-4xl font-bold text-white bg-gradient-to-br from-blue-900 to-blue-950">
            <p>Ensure secure and authorized deployment process</p>
            <DummyContent imageSrc="/6.jpg" />
          </div>
        ),
      },
      
    // Add more tabs with different image sources as needed
  ];

  return (
    <>
     
    <div className="h-[20rem] md:h-[40rem] [perspective:1000px] relative b flex flex-col  max-w-5xl mx-auto w-full  items-start justify-start my-40">
        
      <Tabs tabs={tabs} />
    </div>
    </>
  );
}

const DummyContent = ({ imageSrc }:{imageSrc:any}) => {
  return (
    <div>
      <Image
        src={imageSrc}
        alt="dummy image"
        width={1000}
        height={1000}
        className="object-cover object-left-top h-[60%]  md:h-[90%] absolute -bottom-10 inset-x-0 w-[90%] rounded-xl mx-auto"
      />
    </div>
  );
};
