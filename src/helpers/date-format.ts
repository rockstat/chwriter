
const pad = function(num:number){
  return ('0' + String(num)).slice(-2);
}

export const formatDate =  function(ts: number){
    const date = new Date(ts)
    const [month, day, year] = [
      pad(date.getMonth()),
      pad(date.getDate()),
      date.getFullYear(),
      ];
      return `${year}-${month}-${day}`

}

export const formatDateTime =  function(ts: number){
    const date = new Date(ts)
    const [month, day, year] = [
      pad(date.getMonth()),
      pad(date.getDate()),
        date.getFullYear(),
      ];
      const [hour, minutes, seconds] = [
        pad(date.getHours()),
        pad(date.getMinutes()),
        pad(date.getSeconds()),
      ];

      return `${year}-${month}-${day} ${hour}:${minutes}:${seconds}`
}
