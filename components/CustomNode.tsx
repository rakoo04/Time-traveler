import React, { memo, useRef } from 'react';
import { Handle, Position, NodeProps } from 'reactflow';
import { NodeData } from '../types';
import Loader from './Loader';

const CustomNode: React.FC<NodeProps<NodeData>> = ({ id, data }) => {
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleRootImageClick = () => {
    if (data.type === 'root' && !data.image && fileInputRef.current) {
      fileInputRef.current.click();
    } else if (data.image && data.onImagePreview) {
      data.onImagePreview(data.image);
    }
  };

  const onFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    if (event.target.files && event.target.files[0] && data.onImageUpload) {
      data.onImageUpload(event.target.files[0]);
    }
  };

  const handleGenerateClick = () => {
    if(data.type === 'event' && data.eventPrompt && data.onGenerateImage) {
        data.onGenerateImage(id, data.eventPrompt);
    }
  }

  const handleExpandClick = () => {
    if (data.type === 'event' && data.eventPrompt && data.onExpandNode) {
      data.onExpandNode(id, { title: data.title, prompt: data.eventPrompt });
    }
  }

  const isRoot = data.type === 'root';
  const hasImage = !!data.image;
  const nodeClass = `
    w-64 h-64 rounded-full flex flex-col items-center justify-center p-4 
    shadow-2xl transition-all duration-500
    ${isRoot ? 'bg-gradient-to-br from-purple-600 to-indigo-800' : 'bg-gradient-to-br from-cyan-500 to-blue-700'}
    ${data.isLoading ? 'animate-pulse' : ''}
    border-4 
    ${hasImage ? 'border-green-400' : isRoot ? 'border-purple-400' : 'border-cyan-300' }
  `;

  return (
    <div className={nodeClass}>
      <Handle type="target" position={Position.Top} className="!bg-teal-500" />
      <div className="text-center text-white w-full h-full flex flex-col items-center justify-center relative">
        {data.isLoading ? (
          <Loader />
        ) : (
          <>
            {hasImage ? (
              <img 
                src={data.image} 
                alt={data.title} 
                className="w-full h-full object-cover rounded-full cursor-pointer hover:opacity-80 transition-opacity"
                onClick={() => data.onImagePreview && data.onImagePreview(data.image as string)}
              />
            ) : (
              <>
                <h3 className="text-lg font-bold mb-2">{data.title}</h3>
                <p className="text-xs px-4">{data.text}</p>
                {isRoot && (
                  <>
                    <button
                      onClick={handleRootImageClick}
                      className="mt-4 bg-cyan-400 text-gray-900 font-bold py-2 px-4 rounded-full hover:bg-cyan-300 transition-colors"
                    >
                      Upload Image
                    </button>
                    <input
                      type="file"
                      ref={fileInputRef}
                      onChange={onFileChange}
                      className="hidden"
                      accept="image/png, image/jpeg"
                    />
                  </>
                )}
                {!isRoot && !hasImage && (
                    <button
                      onClick={handleGenerateClick}
                      className="mt-4 bg-purple-500 text-white font-bold py-2 px-4 rounded-full hover:bg-purple-400 transition-colors"
                    >
                      Enter Portal
                    </button>
                )}
              </>
            )}
          </>
        )}
        
        {hasImage && !isRoot && (
           <div className="absolute bottom-10">
             <button
                onClick={handleExpandClick}
                className="bg-green-600 text-white font-bold py-2 px-4 rounded-full hover:bg-green-500 transition-colors text-sm shadow-lg"
              >
                Explore Further
              </button>
           </div>
        )}

        {hasImage && (
          <div 
            className={`absolute bottom-0 bg-black bg-opacity-60 text-center p-2 w-full rounded-b-full ${data.onImagePreview ? 'cursor-pointer' : ''}`}
            onClick={() => data.onImagePreview && data.onImagePreview(data.image as string)}
          >
            <h3 className="text-sm font-bold text-cyan-200">{data.title}</h3>
          </div>
        )}
      </div>
      <Handle type="source" position={Position.Bottom} className="!bg-teal-500" />
    </div>
  );
};

export default memo(CustomNode);