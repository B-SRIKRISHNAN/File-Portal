class FileSystemWriter{

    writeStream = null;
    constructor ()
    {

    }
    /**Write obtained DATA to file */
    writeToFile = async  (data) =>{

        if(this.writeStream!=null)
        {
          await  this.writeStream.write(data);
        }
    }
    /**Close the writable stream to file if it exists */
    closeWritableStream = async ()=>{

        if(this.writeStream!=null)
        {
            await this.writeStream.close();
            this.writeStream = null;
        }
    }

    /**  Create a writable stream to a file in user system*/
    createWriteable = async (filename,fileType)=>{
        let type = {};
        type[fileType]=[];

        const fileHandle = await window.showSaveFilePicker({suggestedName:filename,types:[{accept:type}]});
        this.writeStream = await fileHandle.createWritable();    
    }
}

export function getFileWriterObj()
{
    let fileSystemWriter = new FileSystemWriter();
    return fileSystemWriter;
}

    
