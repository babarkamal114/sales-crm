import React from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from './tooltip'

export interface ItemHelpProps {
    children : React.ReactNode;
    content : string;

}

function ItemHelp({children , content}: ItemHelpProps) {
  return (
<Tooltip>
    <TooltipTrigger>
        {children}
    </TooltipTrigger>
    <TooltipContent>
        {content}
    </TooltipContent>
</Tooltip>  
)
}

export default ItemHelp