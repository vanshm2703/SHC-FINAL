import Image from "next/image";
import { Tabs } from "../ui/tabs";

export default function TabsDemo() {
  const tabs = [

    {
        title: "Seamless UI Integration",
        value: "Seamless UI Integration",
        content: (
          <div className="w-full overflow-hidden relative h-full rounded-2xl p-10 text-xl md:text-4xl font-bold text-white bg-gradient-to-br from-blue-900 to-blue-950">
            <p>Beautiful design meets powerful functionality</p>
            <DummyContent imageSrc="/d.jpeg" />
          </div>
        ),
      },
    {
      title: "Code generation",
      value: "Code generation",
      content: (
        <div className="w-full overflow-hidden relative h-full rounded-2xl p-10 text-xl md:text-4xl font-bold text-white bg-gradient-to-br from-blue-900 to-blue-950">
          <p>Idea to code in seconds. Write it out, we'll build it</p>
          <DummyContent imageSrc="/a.jpeg" />
        </div>
      ),
    },
    {
      title: "Prompt optimization",
      value: "Prompt optimization",
      content: (
        <div className="w-full overflow-hidden relative h-full rounded-2xl p-10 text-xl md:text-4xl font-bold text-white bg-gradient-to-br from-blue-900 to-blue-950">
          <p>Write like a pro, code like a prompt perfection</p>
          <DummyContent imageSrc="/b.jpeg" />
        </div>
      ),
    },
    
      {
        title: "Create PR",
        value: "",
        content: (
          <div className="w-full overflow-hidden relative h-full rounded-2xl p-10 text-xl md:text-4xl font-bold text-white bg-gradient-to-br from-blue-900 to-blue-950">
            <p>Earn points for creating automated PRs</p>
            <DummyContent imageSrc="/c.jpeg" />
          </div>
        ),
      },
      {
        title: "Gamified Element",
        value: "chat",
        content: (
          <div className="w-full overflow-hidden relative h-full rounded-2xl p-10 text-xl md:text-4xl font-bold text-white bg-gradient-to-br from-blue-900 to-blue-950">
            <p>Visualize your codebase in 3D, explore like a game</p>
            <DummyContent imageSrc="/fifth.jpeg" />
          </div>
        ),
      },
      {
        title: "Knowledge Graph",
        value: "Knowledge Graph",
        content: (
          <div className="w-full overflow-hidden relative h-full rounded-2xl p-10 text-xl md:text-4xl font-bold text-white bg-gradient-to-br from-blue-900 to-blue-950">
            <p>Visualize code connections, see the bigger picture</p>
            <DummyContent imageSrc="/sixth.jpeg" />
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
