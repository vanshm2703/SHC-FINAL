import React from 'react'
import Split from 'react-split'
import Code from './Code/Code';



type WorkspaceProps = {};

const Workspace: React.FC<WorkspaceProps> = () => {
	return (
		<>
			
				<Code />
				<div>The Code Editor will be here</div>

			
		</>
	);
};
export default Workspace;
