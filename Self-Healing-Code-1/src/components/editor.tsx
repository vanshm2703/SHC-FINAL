"use client"
import Editor from '@monaco-editor/react';



export function CodeEditor({ code, setCode, lang = "javascript", setLang }: { code: any, setCode: any, lang: any, setLang: any }) {

    function handleEditorChange(value: any, event: any) {
        setCode(value);
    }

    return <>
        <Editor
            height={(70) + 'vh'}
            defaultLanguage={lang}
            theme="light"
            defaultValue={code}
            onChange={handleEditorChange}
        />
    </>
}