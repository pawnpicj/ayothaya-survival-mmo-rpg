/* Terrain and scenery are projected from world coordinates. Actors are upright sprites. */
(function () {
  'use strict';
  const WORLD_W = 1680;
  const WORLD_H = 1120;
  const PITCH = .60;
  const TAU = Math.PI * 2;
  const BASE_YAW = -.105;
  const clamp = (value, min, max) => Math.max(min, Math.min(max, value));
  const directions={e:[1,0],se:[1,1],s:[0,1],sw:[-1,1],w:[-1,0],nw:[-1,-1],n:[0,-1],ne:[1,-1]};
  const strikePhase=window.AyothayaGame.strikePhase;
  const ease=t=>t*t*(3-2*t);
  const skillEffects = {
    heavy: { duration: .39, colors: ['#f59a36', '#fff3bc', '#7d331b'] },
    sweep: { duration: .50, colors: ['#f38138', '#ffe5a7', '#803519'] },
    guard: { duration: .53, colors: ['#52d9c4', '#d9fff1', '#205d64'] },
    heal: { duration: .78, colors: ['#81db63', '#eaffb8', '#3a6232'] },
    dash: { duration: .39, colors: ['#829cff', '#e0f4ff', '#3d4d95'] },
    thrust: { duration: .32, colors: ['#c24677', '#ffe1cc', '#59213e'] },
    bleed: { duration: .30, colors: ['#b13e63', '#ffadc0', '#602137'] },
    interrupt: { duration: .38, colors: ['#a88bdf', '#fff3dd', '#4b306b'] },
  };

  function attackWeight(progress) {
    const windUp=.23;
    if(progress<windUp) return -.42*ease(progress/windUp);
    if(progress<strikePhase) return -.42+1.42*ease((progress-windUp)/(strikePhase-windUp));
    return 1-ease((progress-strikePhase)/(1-strikePhase));
  }

  function seeded(seed) {
    return () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
  }

  function surface(width, height) {
    const canvas = document.createElement('canvas');
    canvas.width = width;
    canvas.height = height;
    return canvas;
  }

  function conceptSprite(sheet, art, height) {
    const [x,y,sourceWidth,sourceHeight]=art.rect;
    const width=Math.round(sourceWidth*height/sourceHeight);
    const cutout=surface(width,height);
    const cutoutContext=cutout.getContext('2d');
    cutoutContext.imageSmoothingQuality='high';
    if(art.clip) {
      cutoutContext.beginPath();
      art.clip.forEach(([u,v],index)=> {
        if(index===0) cutoutContext.moveTo(u*width,v*height);
        else cutoutContext.lineTo(u*width,v*height);
      });
      cutoutContext.closePath();
      cutoutContext.clip();
    }
    cutoutContext.drawImage(sheet,x,y,sourceWidth,sourceHeight,0,0,width,height);

    const silhouette=surface(width,height);
    const ink=silhouette.getContext('2d');
    ink.drawImage(cutout,0,0);
    ink.globalCompositeOperation='source-in';
    ink.fillStyle='#31251b';
    ink.fillRect(0,0,width,height);

    const sprite=surface(width+2,height+2);
    const output=sprite.getContext('2d');
    output.globalAlpha=.65;
    for(const [dx,dy] of [[0,1],[2,1],[1,0],[1,2]]) output.drawImage(silhouette,dx,dy);
    output.globalAlpha=1;
    output.drawImage(cutout,1,1);
    return {sprite,anchor:[(width*art.anchor[0]+1)/sprite.width,(height*art.anchor[1]+1)/sprite.height]};
  }

  function poly(ctx, points, fill, stroke) {
    ctx.beginPath();
    ctx.moveTo(...points[0]);
    for (let i = 1; i < points.length; i++) ctx.lineTo(...points[i]);
    ctx.closePath();
    ctx.fillStyle = fill;
    ctx.fill();
    if (stroke) {
      ctx.strokeStyle = stroke;
      ctx.lineWidth = 1;
      ctx.stroke();
    }
  }

  function roadY(x, ruins) {
    return (ruins ? 550 : 562) + 16 * Math.sin((x - 420) / 173) + 12 * Math.sin(x / 355);
  }

  function waterY(x, ruins) {
    return 156 + Math.sin(x / 213) * 26 + Math.cos(x / 83) * 10 + (ruins ? 15 : 0);
  }

  function createTerrain(ruins) {
    const canvas = surface(WORLD_W / 2, WORLD_H / 2);
    const ctx = canvas.getContext('2d');
    const random = seeded(ruins ? 224147 : 39143);
    const patch = surface(30, 20);
    const noise = Array.from({ length: patch.width * patch.height }, random);
    const image = ctx.createImageData(canvas.width, canvas.height);
    const palettes = {
      water: ruins ? [37, 77, 68] : [31, 91, 91],
      bank: [103, 108, 63], sand: ruins ? [156, 128, 77] : [172, 133, 79],
      rim: [134, 126, 67], green: ruins ? [79, 99, 55] : [91, 118, 57],
      forest: [53, 81, 52], rice: [93, 121, 54], stone: [117, 109, 79]
    };
    for (let j = 0; j < canvas.height; j++) {
      const y = j * 2;
      for (let i = 0; i < canvas.width; i++) {
        const x = i * 2;
        const px = i / 31;
        const py = j / 31;
        const ix = Math.floor(px);
        const iy = Math.floor(py);
        const a = px - ix;
        const b = py - iy;
        const offset = ix + iy * patch.width;
        const n1 = noise[offset] * (1 - a) + noise[offset + 1] * a;
        const n2 = noise[offset + patch.width] * (1 - a) + noise[offset + patch.width + 1] * a;
        const broad = n1 * (1 - b) + n2 * b;
        const micro = (random() - .5) * 16;
        const wave = Math.sin(i / 16) * 3 + Math.cos(j / 14) * 3;
        const shore = waterY(x, ruins) + wave;
        const mainRoad = Math.abs(y - roadY(x, ruins));
        const towardWest = 439 + Math.cos(y / 65) * 24;
        const towardTemple = 838 + Math.sin((y - 320) / 64) * 45;
        const branch = y > 207 && y < 570 && (Math.abs(x - towardWest) < 20 || Math.abs(x - towardTemple) < 22);
        const courtyard = y > 420 && y < 512 && x > 445 && x < 805 && broad + wave * .025 > .40;
        const field = !ruins && x > 1091 && x < 1403 && y > 298 && y < 489;
        const edge = x < 175 || x > 1505 || y > 874;
        let color = palettes.green;
        if (y < shore - 5) color = palettes.water;
        else if (y < shore + 10) color = palettes.bank;
        else if (mainRoad < 27 + wave * .75 || branch || courtyard || (field && (x < 1099 || x > 1396 || y < 306 || y > 479 || (y > 365 && y < 373)))) color = palettes.sand;
        else if (field) color = palettes.rice;
        else if (mainRoad < 35 + wave || edge && broad > .61) color = palettes.rim;
        else if (edge || (broad < .32 && y > 240)) color = palettes.forest;
        else if (ruins && y > 236 && y < 478 && x > 496 && x < 1070) color = palettes.stone;
        const value = (broad - .5) * 45 + wave + micro * (color === palettes.water ? .42 : 1);
        const row = (j * canvas.width + i) * 4;
        image.data[row] = color[0] + value;
        image.data[row + 1] = color[1] + value * 1.15;
        image.data[row + 2] = color[2] + value * .73;
        image.data[row + 3] = 255;
      }
    }
    ctx.putImageData(image, 0, 0);
    for (let i = 0; i < 7200; i++) {
      const x = random() * WORLD_W;
      const y = random() * WORLD_H;
      if (y < waterY(x, ruins) - 3) {
        ctx.fillStyle = ['#397c78', '#32716e', '#56968a', '#306763'][i % 4];
        ctx.globalAlpha = .35 + random() * .44;
        ctx.fillRect(Math.floor(x / 2), Math.floor(y / 2), 3 + random() * 22, .7 + random() * .45);
      } else if (Math.abs(y - roadY(x, ruins)) < 30) {
        ctx.fillStyle = ['#b89661', '#805e40', '#ddbd86', '#a98555'][i % 4];
        ctx.globalAlpha = .4 + random() * .3;
        ctx.fillRect(Math.floor(x / 2), Math.floor(y / 2), 1 + random() * 3, 1);
      } else {
        const h = random() * 3 + 1;
        ctx.fillStyle = ['#536435', '#778748', '#a5a05d', '#3e5835', '#cab77b'][i % 5];
        ctx.globalAlpha = .30 + random() * .55;
        ctx.fillRect(Math.floor(x / 2), Math.floor(y / 2), h * .6, h);
        if (i % 12 === 0) {
          ctx.fillStyle = ['#ddc27c', '#e4dfa1', '#bc9367'][i % 3];
          ctx.fillRect(Math.floor(x / 2), Math.floor(y / 2) - 1, 1.1, 1.1);
        }
      }
    }
    ctx.globalAlpha = 1;
    if (!ruins) {
      for (let y = 313; y < 478; y += 9) {
        if (y > 359 && y < 377) continue;
        ctx.fillStyle = ['#62692f', '#52622f', '#596a33'][Math.round(y / 9) % 3];
        ctx.fillRect(551, y / 2, 146, 1.8);
        for (let x = 1107; x < 1390; x += 9) {
          ctx.fillStyle = ['#a4ac69','#83984b','#788a41','#abb373'][Math.floor(random() * 4)];
          ctx.fillRect(x / 2 + random() * 1.7, y / 2 - 1, 2, 2.2);
        }
      }
    }
    return canvas;
  }

  /* A painted canopy sprite shares its ground anchor with the projected scenery. */
  function treeSprite(seed, kind) {
    const tall = kind === 'palm';
    const shrub = kind === 'shrub';
    const W = tall ? 88 : shrub ? 53 : 127;
    const H = tall ? 119 : shrub ? 38 : 155;
    const canvas = surface(W, H);
    const ctx = canvas.getContext('2d');
    const random = seeded(seed);
    const palette = kind === 'lush' ? ['#213b2a','#375435','#527344','#72914d','#8ba65b','#a4b876'] : ['#233b29','#374a29','#4c6233','#64793a','#8d954a','#a6ae59'];
    const mid = Math.round(W / 2);
    if (!shrub) {
      const lean = tall ? 10 : Math.round((random() - .5) * 17);
      poly(ctx, [[mid - 11,H-3],[mid - 5,H-17],[mid - 6,H-61],[mid + lean - 4,34],[mid + lean + 4,32],[mid + 7,H-55],[mid + 8,H-12],[mid + 12,H-2]], '#493b2c','#2d3425');
      poly(ctx, [[mid - 4,H-6],[mid - 1,H-28],[mid - 2,H-62],[mid+lean,36],[mid+lean+3,38],[mid+3,H-57],[mid+4,H-13]], '#856a42');
      ctx.fillStyle = '#a88a57';
      for (let i = 0; i < 30; i++) {
        const y = Math.floor(42 + random() * (H - 48));
        ctx.fillRect(mid - 2 + lean * (H - y) / H + (random() - .5) * 5, y, 1, 2 + random() * 4);
      }
      if (tall) {
        const top = 28;
        for (let i = 0; i < 11; i++) {
          const sign = i % 2 === 0 ? -1 : 1;
          const reach = 12 + random() * 23;
          const offset = i * 2.9;
          const crown = mid + lean;
          poly(ctx, [[crown,top],[crown+sign*reach*.58,top-17+offset],[crown+sign*reach,top-9+offset],[crown+sign*reach*.93,top+9+offset],[crown+sign*reach*.58,top+4+offset],[crown+sign*reach*.21,top+3]], palette[i % 4], '#263b25');
          for (let j = 1; j < 9; j++) {
            ctx.fillStyle = palette[(i + j) % 3 + 3];
            ctx.fillRect(Math.round(crown + sign * reach * j / 9), Math.round(top + (offset - 15) * j / 9 + (random() - .5) * 7), 3, 1);
          }
        }
        ctx.fillStyle = '#d1a160';
        ctx.fillRect(mid + lean - 3, 31, 4, 4);
        return canvas;
      }
      poly(ctx, [[mid,H-31],[mid-10,H-55],[mid-31,H-84],[mid-34,H-96],[mid-26,H-97],[mid-18,H-77],[mid,H-57],[mid+19,H-75],[mid+24,H-90],[mid+30,H-88],[mid+25,H-70],[mid+9,H-51]], '#614d31');
    }
    const centerY = shrub ? 20 : 55;
    for (let ring = 0; ring < 4; ring++) {
      const count = shrub ? 13 : 23;
      for (let i = 0; i < count; i++) {
        const theta = random() * TAU;
        const radial = Math.sqrt(random()) * (1 - ring * .10);
        const x = Math.round(mid + Math.cos(theta) * (W * .40) * radial - ring * 1.2);
        const y = Math.round(centerY + Math.sin(theta) * (shrub ? 12 : 41) * radial - ring * (shrub ? 1 : 7));
        const radius = (shrub ? 3 : 7) + random() * (shrub ? 8 : 14);
        const points = [];
        for (let side = 0; side < 10; side++) {
          const angle = side / 10 * TAU;
          const distance = radius * (.73 + random() * .29);
          points.push([Math.round(x + distance * Math.cos(angle)), Math.round(y + distance * Math.sin(angle) * .78)]);
        }
        poly(ctx, points, palette[Math.min(4, ring + Math.floor(random() * 2))]);
        for (let k = 0; k < 14; k++) {
          const dx = (random() - .5) * radius * 1.5;
          const dy = (random() - .5) * radius;
          ctx.fillStyle = palette[clamp(ring + (random() < .75 ? 1 : -1), 0, 5)];
          ctx.fillRect(Math.round(x + dx), Math.round(y + dy), 1 + Math.floor(random() * 3), 1 + Math.floor(random() * 2));
        }
      }
    }
    return canvas;
  }

  function createZone(ruins) {
    const random = seeded(ruins ? 22396 : 9671);
    const objects = [];
    const add = (type,x,y,props) => objects.push({type,x,y,...props});
    const parts = ruins ? [
      { x: 650, y: 265, w: 225, h: 140, type: 'chedi' },
      { x: 430, y: 310, w: 134, h: 116, type: 'broken' },
      { x: 1000, y: 320, w: 165, h: 125, type: 'broken' },
    ] : [
      { x: 365, y: 313, w: 130, h: 105, type: 'house', color: 'teal' },
      { x: 520, y: 290, w: 146, h: 127, type: 'house', color: 'amber' },
      { x: 738, y: 270, w: 142, h: 132, type: 'temple', color: 'red' },
      { x: 930, y: 295, w: 140, h: 125, type: 'house', color: 'green' }
    ];
    for (const part of parts) add(part.type,part.x + part.w / 2,part.y + part.h / 2,part);
    if (!ruins) {
      add('house', 288, 271, { x: 244, y: 226, w: 89, h: 89, color: 'green' });
      add('house', 586, 234, { x: 544, y: 198, w: 84, h: 74, color: 'teal' });
      add('pier', 703, 166, { x: 669, y: 119, w: 65, h: 113 });
      add('boat', 525, 100, { size: .8 });
      add('boat', 717, 112, { size: 1 });
      add('spiritHouse', 795, 487, { size: .9 });
      add('well', 584, 474, { size: 1 });
      add('market', 418, 463, { size: 1 });
      add('market', 500, 462, { size: .82 });
      add('pole', 617, 461, { size: .82 });
      add('pole', 634, 506, { size: .55 });
      add('pole', 938, 483, { size: .65 });
      add('pole', 848, 617, { size: .62 });
    } else {
      add('well', 829, 487, { size: 1.35 });
      for (const [x,y] of [[571,445],[624,452],[913,455],[961,463],[495,638],[722,738],[1005,698],[1234,413],[1373,666],[1120,798]]) add('pillar',x,y,{size:.66+random()*.5});
    }
    for (let i = 0; i < 89; i++) {
      const x = 56 + random() * (WORLD_W - 112);
      const y = 180 + random() * (WORLD_H - 185);
      if (y < 693 && x > 230 && x < 1490 && Math.abs(y - roadY(x,ruins)) < 189) continue;
      if (y < 498 && x > 210 && x < 1510) continue;
      add('tree',x,y,{index: i % 11, size: .66 + random() * .83});
    }
    for (const [x,y,size,index] of [
      [52,392,1.36,1],[181,418,1.12,3],[236,449,.87,10],[337,192,1.06,7],[470,237,1.0,8],[849,221,1.23,6],
      [1005,220,1.0,7],[1184,230,1.12,9],[1458,307,1.22,1],[1520,343,1.15,3],
      [172,692,1.25,7],[263,729,1.08,1],[348,675,1.15,9],[460,783,1.21,3],[575,766,1.00,0],
      [610,851,1.30,6],[910,826,1.10,3],[1049,782,1.22,4],[1132,733,.91,6],
      [1247,844,1.23,0],[1367,714,1.29,2],[1476,775,1.07,3]
    ]) add('tree',x,y,{index,size});
    for (let i = 0; i < 147; i++) {
      const x = 70 + random() * (WORLD_W - 140);
      const y = 176 + random() * (WORLD_H - 190);
      if (y < waterY(x,ruins)+8 || Math.abs(y-roadY(x,ruins)) < 45) continue;
      if (!ruins && x > 1082 && x < 1415 && y > 280 && y < 500) continue;
      if (parts.some(p => x > p.x - 12 && x < p.x + p.w + 12 && y > p.y - 12 && y < p.y + p.h + 12)) continue;
      if (x > 455 && x < 850 && y > 438 && y < 555) continue;
      add(i % 5 === 0 ? 'rock' : 'shrub',x,y,{index: i % 4,size:.35 + random() * .72});
    }
    for (const row of [[319,498,355,480],[537,521,591,518],[1120,501,1265,501],[1281,501,1400,501],[1110,296,1396,296]]) {
      if (!ruins) add('fence',(row[0]+row[2])/2,(row[1]+row[3])/2,{row});
    }
    return {terrain: createTerrain(ruins), objects, ruins};
  }

  const brick = ['#bb8053', '#8d5a42', '#704535', '#a56947', '#dca46a'];
  const wood = ['#b3834b', '#775238', '#563f2d', '#946743', '#d4a36a'];
  const ivory = ['#d6c495', '#9a8c68', '#786b50', '#b0a07a', '#dfcc9b'];
  const roofs = {
    red: ['#9c4a2a','#b95b32','#df8044','#763c27','#eed68b'],
    amber: ['#8d572e','#a36c39','#c58e4c','#623d2d','#e0b272'],
    teal: ['#37635c','#4c7667','#6a8973','#294a45','#b69866'],
    green: ['#52623a','#6a7542','#889353','#38432d','#c6ac6c']
  };

  function createModels(ctx, project, yaw) {
    const front = Math.cos(yaw) >= 0;
    const right = Math.sin(yaw) >= 0;
    const face = (vertices, fill, stroke) => poly(ctx, vertices.map(point => project(...point)), fill, stroke);
    const line = (points, color, width = 1) => {
      ctx.beginPath();
      ctx.moveTo(...project(...points[0]));
      for (const vertex of points.slice(1)) ctx.lineTo(...project(...vertex));
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.stroke();
    };
    const mix = (a,b,t) => a.map((point,axis)=>point*(1-t)+b[axis]*t);
    function masonry(vertices, columns, rows, seed) {
      const [a,b,c,d] = vertices;
      const random = seeded(seed);
      for (let row = 0; row < rows; row++) {
        const v = row / rows;
        const q = (row + .90) / rows;
        const lowerA = mix(a,d,v), lowerB = mix(b,c,v);
        const upperA = mix(a,d,q), upperB = mix(b,c,q);
        line([lowerA,lowerB],'#855939',.54);
        for (let column = 0; column < columns; column++) {
          const u = (column + (row % 2 === 0 ? .12 : .56)) / columns;
          const p = Math.min(1,u + .83 / columns);
          const tint = random();
          if (tint < .31) {
            face([mix(lowerA,lowerB,u),mix(lowerA,lowerB,p),mix(upperA,upperB,p),mix(upperA,upperB,u)], tint < .12 ? 'rgba(218,172,104,.39)' : 'rgba(81,58,45,.24)');
          }
          line([mix(lowerA,lowerB,u),mix(upperA,upperB,u)],'#805336',.48);
        }
      }
    }
    const box = (x,y,w,d,z,h,palette,stripes) => {
      const north = [[x,y,z],[x+w,y,z],[x+w,y,z+h],[x,y,z+h]];
      const south = [[x+w,y+d,z],[x,y+d,z],[x,y+d,z+h],[x+w,y+d,z+h]];
      const east = [[x+w,y,z],[x+w,y+d,z],[x+w,y+d,z+h],[x+w,y,z+h]];
      const west = [[x,y+d,z],[x,y,z],[x,y,z+h],[x,y+d,z+h]];
      const top = [[x,y,z+h],[x+w,y,z+h],[x+w,y+d,z+h],[x,y+d,z+h]];
      face(front ? south : north, palette[0]);
      face(right ? east : west, palette[1]);
      face(top,palette[4]);
      if (stripes) {
        if (palette === brick) {
          masonry(front?south:north,Math.max(1,Math.ceil(w/15)),Math.max(1,Math.ceil(h/7)),1377+Math.round(x+y));
          masonry(right?east:west,Math.max(1,Math.ceil(d/15)),Math.max(1,Math.ceil(h/7)),6167+Math.round(x+y));
          const random=seeded(9943+Math.round(x+y));
          const count=Math.min(54,Math.round(w*d/72));
          for(let i=0;i<count;i++){
            const dx=random()*(w-1),dy=random()*(d-1);
            const [sx,sy]=project(x+dx,y+dy,z+h+.2);
            ctx.fillStyle=i%6===0?'rgba(91,101,48,.61)':i%2?'rgba(136,90,58,.46)':'rgba(250,197,123,.59)';
            ctx.fillRect(Math.round(sx),Math.round(sy),Math.round(1+random()*4),1+Math.round(random()));
          }
          return;
        }
        const ys = front ? y + d : y;
        const xs = right ? x + w : x;
        for (let row = 6; row < h; row += 6) {
          line([[x,ys,z+row],[x+w,ys,z+row]], palette[3], .6);
          line([[xs,y,z+row],[xs,y+d,z+row]], palette[2], .55);
        }
      }
    };
    const roof = (x,y,w,d,z,h,palette,ornate) => {
      const ridgeY = y + d * .5;
      const ridge = [x+w*.5,ridgeY,z+h];
      const X = x+w*.5;
      const left = [[x,y,z],[x,y+d,z],[X,y+d,z+h],[X,y,z+h]];
      const rightFace = [[X,y,z+h],[X,y+d,z+h],[x+w,y+d,z],[x+w,y,z]];
      const gableY = front ? y+d : y;
      const slope = right ? rightFace : left;
      const other = right ? left : rightFace;
      face(other,palette[3],palette[3]);
      face(slope,palette[1],palette[3]);
      face([[x,gableY,z],[x+w,gableY,z],[X,gableY,z+h]],palette[3]);
      const exposed = right ? x+w : x;
      for (let level = .14; level < 1; level += .12) {
        const bx = exposed + (X-exposed) * level;
        const bz = z + h * level;
        line([[bx,y,bz],[bx,y+d,bz]],palette[0],.74);
        for (let by = y + 3 + (level * h % 8); by < y+d-4; by += 5.2) {
          line([[bx,by,bz],[bx + (X-exposed)*.08,by,bz+h*.08]],palette[2],.55);
        }
      }
      const trim = ornate ? palette[4] : palette[2];
      line([[x,gableY,z],[X,gableY,z+h],[x+w,gableY,z]],trim,ornate ? 2.2 : 1.5);
      line([[X,y,z+h],[X,y+d,z+h]],trim,1.2);
      if (ornate) {
        const filigree = [[x+9,gableY,z+4],[X,gableY,z+h-7],[x+w-9,gableY,z+4]];
        face(filigree,'#8f4e28','#d5a653');
        for (let i = 1; i <= 5; i++) {
          const fraction = i / 7;
          line([[X-w*.39*(1-fraction),gableY,z+5+h*fraction],[X,gableY,z+h-5],[X+w*.39*(1-fraction),gableY,z+5+h*fraction]],'#dfb567',.7);
        }
        line([[x+3,gableY,z+1],[x-4,gableY,z+4],[x-7,gableY,z+12]],trim,2);
        line([[x+w-3,gableY,z+1],[x+w+4,gableY,z+4],[x+w+7,gableY,z+12]],trim,2);
        line([[X,gableY,z+h],[X+2,gableY,z+h+8],[X+9,gableY,z+h+13]],trim,2);
      }
      return ridge;
    };
    const door = (x,y,z,w,h,ornate) => {
      face([[x,y,z],[x+w,y,z],[x+w,y,z+h-8],[x+w/2,y,z+h],[x,y,z+h-8]], '#3d3027', ornate ? '#deb372' : '#a67d51');
      for (let off = 3; off < w-2; off += 4) line([[x+off,y,z+1],[x+off,y,z+h-10]],'#68513a',.7);
      line([[x+w-5,y,z+h*.42],[x+w-3,y,z+h*.42]],'#ddba79',1.4);
    };

    function house(o) {
      const {x,y,w,h:d} = o;
      const ornate = o.type === 'temple';
      const base = ornate ? 14 : Math.max(10, w * .118);
      const wall = w * (ornate ? .42 : .33);
      const palette = ornate ? ivory : wood;
      const side = front ? y+d : y;
      box(x-3,y-3,w+6,d+6,0,base*.36,brick,true);
      if (ornate) {
        box(x+2,y+2,w-4,d-4,base*.36,base*.64,brick,true);
      } else {
        for (const px of [x+7,x+w/2,x+w-12]) for (const py of [y+6,y+d-13]) box(px,py,5,6,1,base,wood,false);
      }
      box(x,y,w,d,base,wall,palette,true);
      for (let i = 0; i < 5; i++) {
        const bx = x+4+i*(w-7)/4;
        line([[bx,side,base],[bx,side,base+wall]],ornate ? '#ab9060' : '#583e2c',1.8);
      }
      const doorY = side + (front ? .1 : -.1);
      door(x+w*.41,doorY,base,w*.18,wall*.69,ornate);
      for (const off of [.16, .69]) door(x+w*off,doorY,base+wall*.27,w*.14,wall*.52,ornate);
      const stairsOut = front ? y+d : y-19;
      for (let step = 0; step < 4; step++) {
        const offset = (front ? 3-step : step)*4;
        box(x+w*.34,stairsOut+offset,w*.32,5,0,3+(step+1)*(base-3)/4,ornate ? brick : wood,false);
      }
      roof(x-11,y-12,w+22,d+24,base+wall-3,w*.30,roofs[o.color],ornate);
      if (ornate) roof(x+8,y-8,w-16,d*.62,base+wall+19,w*.28,roofs.red,true);
    }

    function ring(x,y,z,r,sides,twist=0) {
      return Array.from({length:sides}, (_,i) => {
        const angle = twist + i * TAU / sides;
        return [x + r*Math.cos(angle), y + r*Math.sin(angle), z];
      });
    }

    function tower(x,y,size) {
      for (let step=0;step<4;step++) {
        const w = (122-step*14)*size;
        box(x-w/2,y-w/2,w,w,step*8*size,8*size,brick,true);
      }
      const levels = [[32,45],[47,43],[54,38],[59,38],[66,35],[81,31],[101,25],[115,17],[120,19],[124,13],[134,8],[143,6],[152,1]];
      for (let i=0;i<levels.length-1;i++) {
        const a = ring(x,y,levels[i][0]*size,levels[i][1]*size,12,Math.PI/12);
        const b = ring(x,y,levels[i+1][0]*size,levels[i+1][1]*size,12,Math.PI/12);
        const faces = a.map((vertex,k)=>({k,depth:Math.sin(k*TAU/12-yaw),p:[vertex,a[(k+1)%12],b[(k+1)%12],b[k]]}));
        faces.sort((first,last)=>first.depth-last.depth);
        for (const entry of faces) {
          const index = Math.floor((Math.cos(entry.k*TAU/12-yaw)+1)*1.6);
          face(entry.p, i === 2 || i === 7 || i === 9 ? '#c49460' : brick[index], '#895735');
          if (i < 8) masonry(entry.p,i > 4 ? 2 : 3, Math.max(1,Math.round((levels[i+1][0]-levels[i][0])/5)),i*6001+entry.k*197+4723);
          if (i === 4 || i === 5) {
            const [v1,v2,v3,v4]=entry.p;
            const first = mix(v1,v2,.32);
            const end = mix(v1,v2,.68);
            face([first,end,mix(v3,v4,.29),mix(v3,v4,.71)], '#774732');
          }
        }
      }
      for (const [dx,dy] of [[-.68,.19],[.69,.19],[-.53,-.53],[.47,-.43]]) {
        if (dy < 0 && front || dy > 0 && !front) continue;
        const px=x+dx*92*size,py=y+dy*92*size;
        box(px-12*size,py-11*size,24*size,22*size,0,10*size,brick,true);
        for (let t=0;t<5;t++) {
          const width=(22-t*3.5)*size;
          box(px-width/2,py-width/2,width,width,10*size+t*7*size,7*size,brick,true);
        }
      }
    }

    function broken(o) {
      const {x,y,w,h} = o;
      for (let i=0;i<3;i++) box(x+i*4,y+i*4,w-i*8,h-i*8,i*5,5,brick,true);
      const brokenGround = [[.19,.24],[.49,.29],[.71,.22],[.46,.57],[.31,.74],[.51,.71],[.65,.82],[.81,.54]];
      for (const [dx,dy] of brokenGround) {
        const px=x+w*dx,py=y+h*dy;
        face([[px-8,py,15.2],[px-4,py-6,15.2],[px+4,py-6,15.2],[px+10,py,15.2],[px,py+7,15.2]], 'rgba(101,104,58,.64)');
        box(px-3,py-4,6,9,15,4,brick,false);
      }
      for (const [dx,dy,a,b,c] of [[.09,.13,.8,.13,17],[.12,.3,.16,.61,33],[.72,.15,.14,.57,27],[.39,.4,.13,.13,54],[.60,.65,.17,.14,34]]) {
        box(x+w*dx,y+h*dy,w*a,h*b,15,c,brick,true);
      }
    }

    function well(o) {
      const {x,y,size:s}=o;
      const a=ring(x,y,0,20*s,10);
      const b=ring(x,y,9*s,20*s,10);
      const c=ring(x,y,9*s,15*s,10);
      for(let i=0;i<10;i++) face([a[i],a[(i+1)%10],b[(i+1)%10],b[i]],brick[i%4]);
      face(b,'#b1885d','#76553c');
      face(c,'#306e66','#374f43');
      line([[x-8*s,y+2*s,9.4*s],[x-1*s,y,9.4*s],[x+7*s,y+3*s,9.4*s]],'#6ea294');
    }

    function fence(o) {
      const [x,y,tx,ty]=o.row;
      line([[x,y,6],[tx,ty,6]],'#714e33',1.6);
      line([[x,y,12],[tx,ty,12]],'#aa814c',1.9);
      const count=Math.ceil(Math.hypot(tx-x,ty-y)/18);
      for(let i=0;i<=count;i++) {
        const px=x+(tx-x)*i/count;
        const py=y+(ty-y)*i/count;
        box(px-2,py-2,3,4,0,17,wood,false);
      }
    }

    function place(o,time) {
      const {x,y,size:s=1}=o;
      switch(o.type){
        case 'house': case 'temple': house(o); break;
        case 'chedi': tower(o.x+o.w/2,o.y+o.h/2,1.14); break;
        case 'broken': broken(o); break;
        case 'well': well(o); break;
        case 'fence': fence(o); break;
        case 'pier':
          box(x,y,o.w,o.h,0,8,wood,true);
          for(let i=0;i<o.h;i+=8) line([[x,y+i,8],[x+o.w,y+i,8]],'#765a39',.7);
          for(let i=0;i<=5;i++) for(const side of [x+3,x+o.w-4]) box(side,y+19*i,4,5,0,16,wood,false);
          break;
        case 'boat': {
          const z=Math.sin(time*1.9+y)*1.7;
          face([[x-36*s,y,z],[x-24*s,y-8*s,z],[x+26*s,y-8*s,z],[x+38*s,y,z],[x+25*s,y+10*s,z],[x-24*s,y+10*s,z]],'#74482f','#ac8655');
          box(x-12*s,y-7*s,26*s,15*s,z,7*s,wood,true);
          break;
        }
        case 'pillar':
          box(x-13*s,y-13*s,26*s,26*s,0,9*s,brick,true);
          box(x-9*s,y-9*s,18*s,18*s,9*s,34*s,brick,true);
          box(x-11*s,y-11*s,21*s,22*s,43*s,6*s,brick,true);
          break;
        case 'market': case 'spiritHouse': {
          const width=(o.type==='market'?40:22)*s, depth=width*.65,z=width*.64;
          for(const px of [x-width*.46,x+width*.46]) for(const py of [y-depth*.45,y+depth*.45]) box(px,py,3*s,3*s,0,z,wood,false);
          box(x-width*.46,y-depth*.42,width*.92,depth*.88,z*.35,5*s,wood,true);
          roof(x-width*.6,y-depth*.69,width*1.2,depth*1.36,z,width*.29,roofs.amber,o.type==='spiritHouse');
          break;
        }
        case 'pole':
          box(x-2,y-2,4,4,0,38*s,wood,false);
          face([[x,y,36*s],[x+15*s,y+Math.sin(time*2+x)*3*s,32*s],[x+13*s,y+Math.sin(time*2+x)*3*s,22*s],[x,y,24*s]],'#b67b3e','#deaa65');
          break;
        case 'rock': {
          const a=ring(x,y,0,15*s,6,.2), b=ring(x-2*s,y-2*s,10*s,11*s,6,.2);
          face(a,'#374c37');
          for(let i=0;i<6;i++) face([a[i],a[(i+1)%6],b[(i+1)%6],b[i]],['#8c8764','#747257','#64654d'][i%3]);
          face(b,'#9b9670','#b0a37b');
          break;
        }
      }
    }

    return {place};
  }

  function actorSprite(type, dir, frame) {
    const canvas=surface(32,43);
    const ctx=canvas.getContext('2d');
    const rect=(x,y,w,h,color)=>{ ctx.fillStyle=color; ctx.fillRect(x,y,w,h); };
    const shape=(points,color)=>poly(ctx,points,color);
    if (dir==='w'||dir==='nw'||dir==='sw') { ctx.translate(32,0); ctx.scale(-1,1); }
    const side=['w','e','nw','ne','sw','se'].includes(dir);
    const back=['n','nw','ne'].includes(dir);
    if(type==='tamarind') {
      shape([[3,36],[3,31],[6,26],[10,23],[13,19],[18,18],[20,21],[25,23],[28,28],[29,35],[26,41],[10,42]],'#3b4824');
      shape([[5,33],[8,27],[14,23],[19,22],[24,25],[27,29],[27,35],[24,39],[11,40],[6,37]],'#93984a');
      shape([[7,31],[9,27],[15,23],[19,23],[23,26],[25,29],[22,31],[16,30],[12,33]],'#c1b866');
      shape([[13,20],[13,14],[19,12],[23,14],[19,18],[16,20]],'#708d3b');
      rect(10,31,3,4,'#3e4224'); rect(21,30,3,4,'#3e4224'); rect(15,36,4,1,'#3f4826');
    } else if(type==='ghost') {
      shape([[10,38],[8,31],[5,29],[9,25],[9,17],[12,12],[19,10],[24,14],[25,20],[28,25],[25,28],[24,35],[18,39],[15,42]],'#36565e');
      shape([[12,38],[12,29],[8,28],[11,24],[11,16],[15,13],[20,13],[23,16],[23,22],[26,25],[22,28],[21,34],[18,35],[15,40]],'#8ab7b0');
      shape([[12,24],[13,16],[18,14],[22,17],[21,25],[17,30],[15,33],[14,27]],'#bad3ba');
      rect(13,22,3,4,'#2c494d'); rect(19,21,3,4,'#2c494d'); rect(17,26,2,2,'#528682');
    } else if(type==='monkey') {
      shape([[10,40],[7,37],[9,34],[7,28],[7,22],[10,18],[11,14],[22,14],[25,19],[26,26],[23,30],[24,38],[20,42]],'#44372b');
      shape([[9,34],[12,29],[12,25],[9,22],[12,17],[20,16],[24,20],[23,25],[20,28],[23,34],[21,39],[13,40]],'#987148');
      shape([[12,21],[13,19],[20,18],[23,22],[22,27],[17,29],[13,27]],'#ca9c6f');
      rect(13,22,2,2,'#322c26'); rect(20,21,2,2,'#322c26'); rect(16,26,4,1,'#322c26');
      rect(4,30,4,2,'#77563a'); rect(3,25,2,6,'#77563a'); rect(1,23,3,2,'#a28155');
    } else if(type==='guardian') {
      shape([[3,37],[4,27],[9,22],[11,15],[20,13],[25,17],[27,26],[29,35],[25,42],[8,42]],'#453e31');
      shape([[6,28],[11,26],[12,19],[19,17],[23,20],[24,28],[27,34],[23,39],[10,39],[7,35]],'#ab8a59');
      shape([[11,29],[14,21],[22,21],[24,31],[22,37],[15,38],[12,33]],'#d3ac67');
      rect(13,25,4,3,'#f6d87d'); rect(20,25,4,3,'#f6d87d'); rect(18,31,2,4,'#e6bc68');
    } else {
      const elder=type==='elder';
      const vendor=type==='vendor';
      const guard=type==='guard';
      const main=elder?'#b89155':vendor?'#347e70':guard?'#768546':'#a84a36';
      const light=elder?'#e4c982':vendor?'#8eba91':guard?'#b0aa68':'#d17549';
      const outline='#2d2926';
      const skin=elder?'#d7aa78':'#d5a16e';
      const step=frame===1?2:frame===3?-2:0;
      shape([[10,28],[23,29],[23,34],[25,40],[24,42],[17,42],[16,38],[14,39],[14,42],[7,42],[7,39],[9,34]],outline);
      shape([[10,30],[21,30],[21,34+step],[22,40+Math.min(step,0)],[18,40+Math.min(step,0)],[16,35],[14,37],[13,40+Math.min(-step,0)],[9,40+Math.min(-step,0)]],elder?'#777458':'#4a5550');
      rect(8,40+Math.min(-step,0),5,2,'#504232'); rect(19,40+Math.min(step,0),5,2,'#42352a');
      shape([[10,17],[19,17],[23,20],[25,25],[22,27],[23,32],[17,35],[8,32],[8,27],[5,26],[6,21]],outline);
      shape([[9,20],[16,18],[21,20],[22,25],[21,31],[16,33],[10,31],[10,26],[7,25],[8,22]],main);
      shape([[9,20],[11,19],[17,23],[21,26],[22,29],[18,27],[12,24],[9,24]],light);
      rect(8,28,14,2,'#d4ad61'); rect(15,28,3,2,'#e6c683');
      rect(5,25+Math.min(step,0),4,4,skin); rect(22,24+Math.max(step,0),4,4,skin);
      shape([[9,6],[11,3],[15,3],[16,1],[20,2],[21,5],[24,8],[23,15],[19,19],[12,18],[8,15],[7,10]],outline);
      shape([[10,7],[13,5],[19,5],[22,8],[22,15],[18,17],[13,17],[10,15],[9,11]],skin);
      if(back) shape([[8,8],[10,5],[18,4],[23,7],[24,13],[21,16],[14,17],[9,15]],elder?'#6b6557':'#4c372b');
      else {
        shape([[9,11],[9,7],[11,5],[18,4],[22,6],[22,9],[20,10],[17,8],[15,9],[14,8],[12,12]],elder?'#b7b2a0':'#443025');
        rect(side?16:12,12,2,2,'#302823'); rect(20,11,2,2,'#302823');
        if(elder) shape([[12,14],[16,15],[21,13],[20,17],[17,19],[13,17]],'#c5b291');
      }
      if(vendor) {
        shape([[5,9],[11,5],[14,3],[22,3],[26,7],[28,9],[25,11],[8,11]],'#6f4e33');
        shape([[8,8],[12,5],[18,3],[22,5],[26,8],[23,9],[11,9]],'#c7a363');
      } else if(guard) {
        shape([[8,10],[9,5],[14,2],[23,6],[24,10],[21,11],[20,8],[12,8],[10,12]],'#9e8754');
      } else if(!elder) {
        rect(9,7,14,2,'#b99d5f'); rect(1,30,7,2,'#725039');
        shape([[1,30],[3,27],[8,35],[7,38]],'#972f25');
      }
    }
    return canvas;
  }

  function createRenderer(canvas) {
    const ctx=canvas.getContext('2d', {alpha:false});
    const maps={
      village:{
        src:'assets/tha-phraya-east-gate.png',x1:.235,y1:.415,y2:.86,coastal:true,
        shore:[[.415,.69],[.431,.65],[.45,.631],[.474,.631],[.52,.684],[.57,.742],
          [.625,.81],[.68,.861],[.735,.902],[.79,.854],[.86,.82]],
        doorways:{
          'east-gate':{x:1556,y:364,rx:31,ry:50,
            clip:[[1532,410],[1532,347],[1538,333],[1554,313],[1574,330],[1582,345],[1582,410]]},
          'training-gate':{x:278,y:376,rx:34,ry:47,
            clip:[[278,329],[301,339],[312,358],[312,393],[300,413],[278,423],[255,413],[244,393],[244,357],[255,338]]}
        }
      },
      ruins:{
        src:'assets/dong-chedi.png',x1:.196,x2:.918,y1:.433,y2:.884,
        doorways:{
          'west-gate':{x:180,y:544,rx:34,ry:58,
            clip:[[152,597],[152,524],[157,506],[168,494],[181,483],[198,499],[207,520],[207,597]]},
          'harbor-gate':{x:149,y:314,rx:22,ry:50,
            clip:[[130,363],[130,292],[138,279],[148,267],[160,281],[170,296],[170,363]]},
          'inner-gate':{x:1369,y:277,rx:34,ry:58,
            clip:[[1339,331],[1339,259],[1347,246],[1367,223],[1383,240],[1398,261],[1399,331]]}
        }
      },
      cemetery:{
        src:'assets/abandoned-cemetery.png',x1:.17,x2:.91,y1:.37,y2:.88,
        doorways:{'cemetery-exit':{x:170,y:485,rx:41,ry:124,
          clip:[[132,602],[135,446],[147,397],[177,351],[199,375],[214,423],[191,495],[188,602]]}}
      },
      harbor:{
        src:'assets/tha-kham-harbor.png',x1:.18,x2:.86,y1:.48,y2:.87,
        doorways:{'harbor-exit':{x:176,y:505,rx:39,ry:109,
          clip:[[140,611],[140,467],[146,445],[158,423],[177,401],[195,418],[208,444],[210,464],[210,611]]}}
      },
      nipa:{
        src:'assets/nipa-landing.png',x1:.24,x2:.88,y1:.454,y2:.87,doorways:{}
      },
      training:{
        src:'assets/training-yard.png',x1:.266,x2:.88,y1:.32,y2:.86,
        doorways:{'training-exit':{x:226,y:405,rx:64,ry:132,
          clip:[[179,512],[181,355],[190,327],[211,295],[232,278],[252,293],[279,328],[292,352],[287,514]]}}
      }
    };
    for(const map of Object.values(maps)) {
      map.image=new Image();
      map.image.src=map.src;
      for (const doorway of Object.values(map.doorways)) {
        const xs = doorway.clip.map(([x]) => x);
        const ys = doorway.clip.map(([, y]) => y);
        doorway.bounds = { left: Math.min(...xs), right: Math.max(...xs), top: Math.min(...ys), bottom: Math.max(...ys) };
      }
    }
    let map=maps.village;
    let approaches=[];
    const vortexSprite=new Image();
    vortexSprite.src='assets/red-vortex.png';
    const reducedMotion=window.matchMedia('(prefers-reduced-motion: reduce)');
    const pretSlamEffect = window.AyothayaPretSlamEffect?.create();
    const chalawanEffect = window.AyothayaChalawanEffect;
    const chalawanSweepEffect = chalawanEffect?.create();
    const activeEffects = [];
    const heavyEffect = window.AyothayaHeavyEffect?.create();
    const sweepEffect = window.AyothayaSweepEffect?.create();
    const guardEffect = window.AyothayaGuardEffect?.create();
    const healEffect = window.AyothayaHealEffect?.create();
    const interrupt = window.AyothayaInterruptEffect;
    const interruptEffect = interrupt?.create();
    const piercing = window.AyothayaPiercingEffect;
    const piercingEffects = { dash: piercing?.create('dash'), thrust: piercing?.create('thrust') };
    const atlas=new Image();
    let drawPlayerSprite=null;
    atlas.addEventListener('load',()=>{
      drawPlayerSprite=window.AyothayaPlayerSprite.create(atlas);
    },{once:true});
    atlas.src='assets/sprites.png';
    const dummySprite=new Image();
    dummySprite.src='assets/training-dummy.png';
    const pretSprite=new Image();
    pretSprite.src='assets/pret-boss.png';
    const chalawanSprite=new Image();
    chalawanSprite.src='assets/chalawan-boss.png';
    const harborCrateSprite=new Image();
    harborCrateSprite.src='assets/harbor-crate.png';
    const nipaSignSprite=new Image();
    nipaSignSprite.src='assets/nipa-return-sign.png';
    const rabbitSprite=new Image();
    rabbitSprite.src=window.AyothayaPreviewData.rabbit.src;
    const cobraSprite=new Image();
    cobraSprite.src=window.AyothayaPreviewData.cobra.src;
    const cobraQueenSprite=new Image();
    cobraQueenSprite.src=window.AyothayaPreviewData.queen.src;
    const venomPoolSprite=new Image();
    venomPoolSprite.src=window.AyothayaPreviewData.venomAtlas.src;
    const wildAttackSprites=new Map(Object.values(window.AyothayaPreviewData.wildAttacks).map(attack=>{
      const image=new Image();
      image.src=attack.src;
      return [attack.id,image];
    }));
    const { npcArt }=window.AyothayaPreviewData;
    const npcSheets=new Map([...new Set(Object.values(npcArt).map(art=>art.src))].map(src=>{
      const image=new Image();
      image.src=src;
      return [src,image];
    }));
    let guardianSprite=null;
    const guardianArt=window.AyothayaPreviewData?.actors.find(actor=>actor.id==='stone-guardian');
    if(guardianArt) {
      const guardianSheet=new Image();
      guardianSheet.addEventListener('load',()=>{
        guardianSprite=conceptSprite(guardianSheet,guardianArt,112);
      },{once:true});
      guardianSheet.src=guardianArt.src;
    }
    const zones=new Map();
    const trees=Array.from({length:11},(_,i)=>treeSprite(5478+i*171,i>=8?'palm':i%2?'lush':'broad'));
    const shrubs=Array.from({length:4},(_,i)=>treeSprite(1893+i*513,'shrub'));
    const sprites=new Map();
    const camera={x:770,y:570,yaw:BASE_YAW,zoom:1};
    const scene={x:0,y:0,w:1,h:1};
    const spritesheet={s:[0,0],w:[1,0],e:[2,0],n:[3,0],elder:[0,1],tamarind:[1,1],monkey:[2,1],ghost:[3,1]};
    const bounds={minX:135,maxX:1555,minY:190,maxY:930};
    let width=900,height=506,aspect=width/height,zoom=1,sceneMode=false,zoneId=null,lastTime=0,lastState=null,hitAreas=[];
    let renderScale=1;

    function size() {
      const r=canvas.getBoundingClientRect();
      if (!r.width||!r.height) return;
      aspect=r.width/r.height;
      const pixelRatio=clamp(window.devicePixelRatio||1,1,1.5);
      width=Math.max(375,Math.min(1720,Math.round(r.width*pixelRatio)));
      height=Math.max(230,Math.round(width/aspect));
      const pixelWidth=Math.round(width*renderScale),pixelHeight=Math.round(height*renderScale);
      if (canvas.width!==pixelWidth||canvas.height!==pixelHeight){canvas.width=pixelWidth;canvas.height=pixelHeight;}
      ctx.setTransform(pixelWidth/width,0,0,pixelHeight/height,0,0);
      ctx.imageSmoothingEnabled=false;
    }

    function rightEdge(v,view) {
      if(!view.shore) return view.x2;
      const segment=view.shore.findIndex(([y])=>v<=y);
      if(segment<0) return view.shore.at(-1)[1];
      if(segment===0) return view.shore[0][1];
      const [fromY,fromX]=view.shore[segment-1];
      const [toY,toX]=view.shore[segment];
      return fromX+(toX-fromX)*(v-fromY)/(toY-fromY);
    }

    function findGateApproach(gates, y, matches) {
      let nearest;
      let gap = Infinity;
      for (const gate of gates) {
        if (!matches(gate)) continue;
        const inner = gate.outer > gate.inner ? gate.route[0] : gate.route.at(-1);
        const distance = Math.abs(y - inner[1]);
        if (distance >= gap) continue;
        nearest = gate;
        gap = distance;
      }
      return nearest;
    }

    function normalized(x,y,view=map,gates=approaches) {
      const {minX,maxX,minY,maxY}=bounds;
      const v=view.y1+(view.y2-view.y1)*(y-minY)/(maxY-minY);
      const edge=rightEdge(v,view);
      const gate=findGateApproach(gates,y,gate=>gate.outer>gate.inner ? x>gate.inner : x<gate.inner);
      if(gate) {
        const start=gate.outer>gate.inner ? edge : view.x1;
        return [start+(gate.viewX-start)*(x-gate.inner)/(gate.outer-gate.inner),v];
      }
      return [view.x1+(edge-view.x1)*(x-minX)/(maxX-minX),v];
    }

    function project(x,y,z=0) {
      if (sceneMode) {
        const [sx,sy]=normalized(x,y);
        return [scene.x+sx*scene.w,scene.y+sy*scene.h-z*zoom];
      }
      const dx=x-camera.x,dy=y-camera.y;
      const angle=camera.yaw;
      const c=Math.cos(angle),s=Math.sin(angle);
      return [width/2+(dx*c+dy*s)*zoom,height*.64+(-dx*s+dy*c)*PITCH*zoom-z*zoom*.89];
    }

    function unproject(sx,sy) {
      if(sceneMode){
        const v=(sy-scene.y)/scene.h;
        const u=(sx-scene.x)/scene.w;
        const {minX,maxX,minY,maxY}=bounds;
        const edge=rightEdge(v,map);
        const y=minY+(v-map.y1)/(map.y2-map.y1)*(maxY-minY);
        let x=minX+(u-map.x1)/(edge-map.x1)*(maxX-minX);
        const gate=findGateApproach(approaches,y,gate=>gate.outer>gate.inner ? u>edge : u<map.x1);
        if(gate) {
          const start=gate.outer>gate.inner ? edge : map.x1;
          x=gate.inner+(u-start)/(gate.viewX-start)*(gate.outer-gate.inner);
        }
        return {x,y};
      }
      const a=(sx-width/2)/zoom,b=(sy-height*.64)/(zoom*PITCH);
      const c=Math.cos(camera.yaw),s=Math.sin(camera.yaw);
      return {x:camera.x+a*c-b*s,y:camera.y+a*s+b*c};
    }

    function updateCamera(player,time,newZone) {
      const dt=Math.max(0,time-lastTime);
      const factor=1-Math.exp(-dt*7);
      camera.x=newZone?player.x:camera.x+(player.x-camera.x)*factor;
      camera.y=newZone?player.y:camera.y+(player.y-camera.y)*factor;
      zoom=height/510*camera.zoom;
      if(!sceneMode) return;
      const ratio=map.image.naturalWidth/map.image.naturalHeight;
      const base=Math.max(height,width/ratio);
      scene.h=base*camera.zoom;
      scene.w=scene.h*ratio;
      const [px,py]=normalized(camera.x,camera.y);
      scene.x=clamp(width*(aspect>1.36?.51:.47)-px*scene.w,width-scene.w,0);
      scene.y=clamp(height*.635-py*scene.h,height-scene.h,0);
    }

    function shadow(sx,sy,w,h,color='rgba(25,29,18,.31)'){
      ctx.fillStyle=color;
      ctx.beginPath();
      ctx.ellipse(sx,sy,w,h,0,0,TAU);
      ctx.fill();
    }

    function stampedTerrain(terrain) {
      const [ox,oy]=project(0,0),[ax,ay]=project(2,0),[bx,by]=project(0,2);
      ctx.save();
      ctx.transform(ax-ox,ay-oy,bx-ox,by-oy,ox,oy);
      ctx.drawImage(terrain,0,0);
      ctx.restore();
    }

    function drawWater(time,ruins) {
      if(sceneMode){
        if(!map.coastal) return;
        ctx.save();
        ctx.globalAlpha=.29;
        for(let i=0;i<49;i++){
          const x=.785+((i*19)%46)/210;
          const yy=.039+((i*17)%50)/112;
          if(x<.83&&yy>.15) continue;
          if(yy>.18&&yy<.32) continue;
          ctx.fillStyle=i%2?'#a5d5ad':'#699f91';
          const wave=(Math.sin(time*1.4+i*1.91)+1)*.5;
          ctx.globalAlpha=.06+wave*.22;
          ctx.fillRect(Math.round(scene.x+x*scene.w),Math.round(scene.y+yy*scene.h),Math.round((.002+wave*.008)*scene.w),Math.max(1,Math.round(scene.h/600)));
        }
        ctx.restore();
        return;
      }
      ctx.save();
      for(let i=0;i<142;i++){
        const x=(i*225.7)%WORLD_W;
        const y=(i*19.3)%(waterY(x,ruins)-16);
        const phase=Math.sin(i*2.41+time*1.4);
        if(phase<.1) continue;
        const [sx,sy]=project(x+phase*3,y);
        ctx.globalAlpha=phase*.47;
        ctx.fillStyle=i%3?'#79b49a':'#b3c3a0';
        ctx.fillRect(Math.round(sx),Math.round(sy),Math.round((5+i%12)*zoom),Math.max(1,Math.round(zoom)));
      }
      ctx.restore();
    }

    function label(value,x,y,kind,scale){
      if(!value) return;
      const palette={npc:'#f4e0a3',enemy:'#ffefd4',boss:'#f2c7ff',portal:'#a9dfda',remote:'#d9ebff'};
      ctx.font=`600 ${Math.round(14*scale)}px "Segoe UI", "Leelawadee UI", Tahoma, sans-serif`;
      ctx.textAlign='center';
      ctx.textBaseline='bottom';
      ctx.lineJoin='round';
      ctx.strokeStyle='#211f17';
      ctx.lineWidth=3*scale;
      ctx.strokeText(value,x,y);
      ctx.fillStyle=palette[kind]||'#fff2ce';
      ctx.fillText(value,x,y);
    }

    function portalIsOpen(portal, state) {
      if (portal.key) return state.harborUnlocked;
      const gate = state.zoneInfo.innerGate;
      if (portal.id === gate?.id) return gate.open;
      return !portal.quest || state.quest.status === 'completed';
    }

    function doorwayOnScreen(doorway) {
      const { left, right, top, bottom } = doorway.bounds;
      const scaleX = scene.w / map.image.naturalWidth;
      const scaleY = scene.h / map.image.naturalHeight;
      return {
        x: scene.x + doorway.x * scaleX,
        y: scene.y + bottom * scaleY,
        height: (bottom - top) * scaleY,
        radius: Math.max(doorway.x - left, right - doorway.x) * scaleX,
      };
    }

    function drawPortal(entity, sx, sy, time, open) {
      const doorway = sceneMode && map.doorways[entity.id];
      const s = clamp(zoom, .8, 1.6);
      const frame = doorway ? doorwayOnScreen(doorway) : { x: sx, y: sy, height: 32 * s, radius: 16 * s };
      const { x, y, height, radius } = frame;
      if (!doorway) drawGateGlow(x, y, time, open);
      label(open ? entity.name : entity.name + ' · ล็อก', x, y + 22 * s, 'npc', clamp(zoom, .8, 1.18));
      hitAreas.push({ kind: 'portal', entity, sx: x, sy: y,
        radius: Math.max(21 * s, radius + 8 * s), height: height + 9 * s, bottom: 25 * s });
    }

    function clipDoorway(frame, tint) {
      ctx.translate(scene.x, scene.y);
      ctx.scale(scene.w / map.image.naturalWidth, scene.h / map.image.naturalHeight);
      poly(ctx, frame.clip, tint);
      ctx.clip();
    }

    function drawGateVortex(frame,time) {
      if(!vortexSprite.complete || !vortexSprite.naturalWidth) return;
      const rotation=reducedMotion.matches ? .36 : -time*1.3;
      const pulse=reducedMotion.matches?1:1+.055*Math.sin(time*2.2);
      ctx.save();
      clipDoorway(frame, 'rgba(53,4,26,.84)');
      ctx.translate(frame.x,frame.y);
      ctx.scale(frame.rx*pulse,frame.ry*pulse);
      ctx.save();
      ctx.rotate(-rotation*.44);
      ctx.globalAlpha=.48;
      ctx.drawImage(vortexSprite,-1.25,-1.25,2.5,2.5);
      ctx.restore();
      ctx.rotate(rotation);
      ctx.drawImage(vortexSprite,-1,-1,2,2);
      ctx.restore();
    }

    function drawLockedGate(frame) {
      const { left, right, top, bottom } = frame.bounds;
      const width = right - left;
      const height = bottom - top;
      const bar = width / 12;
      ctx.save();
      clipDoorway(frame, 'rgba(29,24,17,.62)');
      for (let index = 0; index < 7; index++) {
        const x = left + width * (index + .5) / 7 - bar / 2;
        ctx.fillStyle = '#241b13';
        ctx.fillRect(x, top, bar, height);
        ctx.fillStyle = '#8c663f';
        ctx.fillRect(x + bar * .12, top, bar * .25, height);
      }
      for (const offset of [.25, .53, .80]) {
        ctx.fillStyle = '#241b13';
        ctx.fillRect(left, top + height * offset, width, bar);
        ctx.fillStyle = '#8c663f';
        ctx.fillRect(left, top + height * offset, width, bar * .25);
      }
      ctx.fillStyle = '#b68b46';
      ctx.fillRect(frame.x - bar, top + height * .59, bar * 2, bar * 1.65);
      ctx.fillStyle = '#33251a';
      ctx.fillRect(frame.x - bar * .15, top + height * .59 + bar * .46, bar * .30, bar * .8);
      ctx.restore();
    }

    function drawGateGlow(x,y,time,unlocked) {
      const s=clamp(zoom,.8,1.6);
      const rx=15*s;
      const ry=5.5*s;
      const pulse=(Math.sin(time*3.1)+1)*.5;
      const color=unlocked?'255,51,77':'255,196,105';
      const rim=unlocked?'#ff9eaa':'#ffd78f';

      ctx.save();
      ctx.translate(x,y);
      ctx.scale(rx,ry);
      const halo=ctx.createRadialGradient(0,0,0,0,0,2.1);
      halo.addColorStop(0,`rgba(${color},${.50+pulse*.14})`);
      halo.addColorStop(.5,`rgba(${color},.30)`);
      halo.addColorStop(1,`rgba(${color},0)`);
      ctx.fillStyle=halo;
      ctx.fillRect(-2.1,-2.1,4.2,4.2);
      ctx.restore();

      ctx.save();
      ctx.beginPath();
      ctx.ellipse(x,y,rx,ry,0,0,TAU);
      ctx.strokeStyle='rgba(25,35,25,.72)';
      ctx.lineWidth=3*s;
      ctx.stroke();
      ctx.strokeStyle=rim;
      ctx.lineWidth=1.2*s;
      ctx.stroke();
      ctx.fillStyle=rim;
      for(let i=0;i<3;i++){
        const lift=(time*.7+i/3)%1;
        ctx.globalAlpha=(1-lift)*.83;
        ctx.fillRect(Math.round(x+(i-1)*rx*.53),Math.round(y-lift*14*s),Math.max(1,Math.round(s)),Math.max(1,Math.round(s*1.5)));
      }
      ctx.restore();
    }

    function drawHarborInteractable(entity,x,y,state,time){
      const scale=clamp(sceneMode ? scene.h/660 : zoom,.8,2.1);
      if(entity.id==='nipa-boarding' && nipaSignSprite.naturalWidth){
        drawNipaReturnSign(entity,x,y,scale);
        return;
      }
      const crate=entity.type==='harbor-crate';
      const open=state.harborQuest.status==='completed';
      shadow(x,y,(crate?16:25)*scale,4*scale);
      ctx.save();
      ctx.translate(Math.round(x),Math.round(y));
      ctx.scale(scale,scale);
      if(crate){
        if(harborCrateSprite.naturalWidth) {
          ctx.imageSmoothingEnabled=false;
          ctx.drawImage(harborCrateSprite,-21,-42,42,42);
        }
        ctx.fillStyle='#f5d477';
        const glow=reducedMotion.matches?0:Math.round(Math.sin(time*4)*2);
        ctx.fillRect(-1,-49+glow,2,8);
        ctx.fillRect(-4,-46+glow,8,2);
      } else {
        drawHarborSign(entity.signText,open);
      }
      ctx.restore();
      const title=open || crate ? entity.name : entity.name+' · ปิด';
      label(title,x,y-(crate?53:67)*scale,open&&!crate?'portal':'npc',clamp(scale,.9,1.2));
      hitAreas.push({kind:'interactable',entity,sx:x,sy:y,radius:(crate?24:38)*scale,height:(crate?56:71)*scale});
    }

    function drawNipaReturnSign(entity,x,y,scale){
      const width=84;
      const height=width*nipaSignSprite.naturalHeight/nipaSignSprite.naturalWidth;
      const top=-height*.96;
      const letteringY=top+height*.44;
      shadow(x+3*scale,y,width*.43*scale,4*scale,'rgba(61,32,15,.30)');
      ctx.save();
      ctx.translate(Math.round(x),Math.round(y));
      ctx.scale(scale,scale);
      ctx.imageSmoothingEnabled=false;
      ctx.drawImage(nipaSignSprite,-width/2,top,width,height);
      ctx.font='700 12px "Leelawadee UI", Tahoma, sans-serif';
      ctx.textAlign='center';
      ctx.textBaseline='middle';
      ctx.fillStyle='#f5d5a2';
      ctx.strokeStyle='#4f2b19';
      ctx.lineWidth=2;
      ctx.strokeText(entity.signText,0,letteringY,width*.72);
      ctx.fillText(entity.signText,0,letteringY,width*.72);
      ctx.restore();
      hitAreas.push({kind:'interactable',entity,sx:x,sy:y,radius:(width/2+3)*scale,height:(height+4)*scale});
    }

    function drawHarborSign(title,open){
      const ink='#2b1c14', gold='#dfaf5d';
      for (const post of [-24, 24]) {
        poly(ctx,[[post-5,-53],[post+4,-56],[post+4,-1],[post-5,1]],'#64402a',ink);
        ctx.fillStyle='#ab7847';
        ctx.fillRect(post-3,-51,2,48);
        ctx.fillStyle='#c09861';
        ctx.fillRect(post-5,-16,9,2);
        ctx.fillRect(post-5,-13,9,2);
      }
      const plaque=[[-36,-44],[-30,-51],[-15,-51],[-8,-55],[0,-62],[8,-55],[15,-51],[30,-51],
        [36,-44],[33,-26],[25,-21],[-25,-21],[-33,-26]];
      poly(ctx,plaque.map(([x,y])=>[x,y+3]),'#4e2c21',ink);
      poly(ctx,plaque,'#8e552f',ink);
      poly(ctx,[[-31,-43],[-26,-47],[-13,-47],[-7,-51],[0,-57],[7,-51],[13,-47],[26,-47],
        [31,-43],[29,-28],[23,-25],[-23,-25],[-29,-28]],open?'#234e46':'#49362b',gold);
      poly(ctx,[[-7,-49],[6,-49],[9,-51],[6,-45],[-4,-45]],gold);
      poly(ctx,[[-2,-49],[-2,-54],[4,-49]],'#ffe4a2');
      ctx.fillStyle='#ffe3aa';
      ctx.font='700 9px "Leelawadee UI", Tahoma, sans-serif';
      ctx.textAlign='center';
      ctx.textBaseline='middle';
      ctx.fillText(title,0,-35,53);
      for (const x of [-34,34]) {
        ctx.fillStyle='#352319';
        ctx.fillRect(x-3,-28,6,10);
        ctx.fillStyle=gold;
        ctx.fillRect(x-2,-27,4,1);
        ctx.fillStyle=open?'#a1f5c8':'#dc9260';
        ctx.fillRect(x-2,-25,4,5);
      }
    }

    function chalawanDrawHeight(width) {
      return width*(chalawanSprite.naturalHeight/chalawanSprite.naturalWidth || .4);
    }

    function drawChalawanSprite(width, headLeft) {
      if (!chalawanSprite.naturalWidth) return;
      const height=chalawanDrawHeight(width);
      if(headLeft) ctx.scale(-1,1);
      ctx.imageSmoothingEnabled=false;
      ctx.drawImage(chalawanSprite,Math.round(-width*.5),Math.round(-height),Math.round(width),Math.round(height));
    }

    function drawChalawanEntrance(boss) {
      const {waterX,waterY,elapsed,duration}=boss.entrance;
      const unit=sceneMode ? scene.h/510 : clamp(zoom,.6,2.4);
      chalawanEffect?.entrance(ctx, project(waterX,waterY), project(boss.x,boss.y),
        elapsed, duration, unit, reducedMotion.matches, drawChalawanSprite);
    }

    function drawActor(actor,kind,sx,sy,state,time){
      if(kind==='portal'){
        drawPortal(actor,sx,sy,time,portalIsOpen(actor,state));
        return;
      }
      const type=actor.sprite||actor.type||(kind==='npc'?'elder':'player');
      const walking=actor.moving||actor.action==='walk';
      const phase=time*11+(kind==='remote'?(actor.x+actor.y)*.01:0);
      const frame=walking?Math.floor(phase%4):0;
      const action=actor.action||'idle';
      const dead=action==='death';
      const attack=action==='attack';
      const attackSprite=attack?wildAttackSprites.get(actor.attackTell?.id):null;
      const hasAttackSprite=Boolean(attackSprite?.naturalWidth);
      const slam=attack && actor.attackStyle==='pret-slam' ? actor.slam : null;
      const dir=(attack&&actor.attackDir)||actor.dir||'s';
      const cast=action==='cast';
      const scale=clamp(zoom,.6,2.4);
      const baseSize=sceneMode?scene.h/510:scale;
      const spriteSize=baseSize*(kind==='enemy'?59:64);
      const unit=spriteSize/64;
      const [dx,dy]=directions[dir]||directions.s;
      const [aimX,aimY]=project(actor.x+dx*30,actor.y+dy*30);
      const bearing=Math.atan2(aimY-sy,aimX-sx);
      const progress=attack?clamp(actor.actionDuration
        ? 1-actor.actionTime/actor.actionDuration : time%0.4/0.4,0,1):0;
      const swing=attack?attackWeight(progress):0;
      const pose=dir==='nw'?'w':dir==='ne'?'e':dir==='sw'?'w':dir==='se'?'e':dir;
      const atlasEntry=spritesheet[type==='player'?pose:type];
      const baseHeight=actor.boss ? 1.92 : kind==='enemy'?(type==='guardian'||type==='dummy'?.9:type==='tamarind'||type==='monkey'?.5:.66):.77;
      const crocodile=type==='chalawan';
      const queen=type==='cobra_queen';
      const cobra=type==='cobra'||queen;
      const heightOnScreen=crocodile ? chalawanDrawHeight(spriteSize*2.19) : spriteSize*(queen?1.42:baseHeight);
      const radius=spriteSize*(crocodile ? 1.03 : actor.boss ? .53 : type==='guardian'?.46:type==='dummy'?.37:kind==='enemy'?.29:.255);
      if (state.targetId===actor.id&&kind==='enemy'&&!dead) {
        const t=(Math.cos(time*6)+1)*.5;
        shadow(sx,sy+2,radius+3+2*t,5+1.5*t,'rgba(214,98,53,.40)');
        ctx.lineWidth=1.5;
        ctx.strokeStyle='#f0a957';
        ctx.beginPath();
        ctx.ellipse(sx,sy+1,radius+3,5.5,0,0,TAU);
        ctx.stroke();
      }
      shadow(sx,sy,Math.max(7,radius*.84),Math.max(2,4*scale));
      if (kind === 'player' && !dead && actor.guardTime > 0) drawGuard(actor, time, unit);
      const bounce=dead||slam||cobra||hasAttackSprite||type==='dummy'?0:attack?Math.max(0,swing)*unit*(kind==='enemy'?7:3)
        :walking?Math.abs(Math.sin(phase))*2.8*scale:Math.sin(time*2.8+actor.x)*scale*.95;
      ctx.save();
      ctx.translate(Math.round(sx),Math.round(sy-bounce));
      if(dead){
        if(crocodile && chalawanEffect){
          const progress=1-actor.actionTime/actor.actionDuration;
          const {tilt,stretchX,stretchY}=chalawanEffect.collapsePose(progress,dx<0);
          ctx.rotate(tilt);
          ctx.scale(stretchX,stretchY);
          ctx.globalAlpha=1-.54*clamp((progress-.65)/.35,0,1);
        } else {
          ctx.globalAlpha=.46;
          ctx.rotate(crocodile?.12:Math.PI*.43);
        }
      }
      else if(slam&&pretSlamEffect){
        const {stretchX,stretchY}=pretSlamEffect.pose(slam,slam.windup+slam.recovery-actor.actionTime);
        ctx.scale(stretchX,stretchY);
      }
      else if(crocodile && attack && actor.attackStyle==='tail-sweep' && chalawanEffect){
        const elapsed=actor.actionDuration-actor.actionTime;
        const { tilt, stretchX, stretchY }=chalawanEffect.sweepPose(actor.slam,elapsed,dx<0,reducedMotion.matches);
        ctx.rotate(tilt);
        ctx.scale(stretchX,stretchY);
      }
      else if(attack&&!cobra&&!hasAttackSprite){
        const lunge=swing*unit*(actor.attackStyle==='heavy'?12:8);
        ctx.translate(Math.cos(bearing)*lunge,Math.sin(bearing)*lunge);
        ctx.rotate(Math.cos(bearing)*swing*.28);
        ctx.scale(1+swing*.085,1-swing*.06);
      }
      else if(walking&&!cobra){ctx.rotate(Math.sin(phase*.5)*.031);}
      if(kind==='remote') ctx.filter='hue-rotate(63deg) saturate(.91)';
      if(action==='hit') ctx.filter='brightness(1.36) saturate(.74)';
      const armedPlayer=type==='player'&&drawPlayerSprite;
      const npc=kind==='npc'?npcArt[actor.id]:null;
      const npcImage=npc && npcSheets.get(npc.src);
      if(armedPlayer) {
        drawPlayerSprite(ctx, actor, { dir, bearing, walking: walking && !dead, phase, progress: attack ? progress : null,
          size: spriteSize, heavyEffect, piercingEffect: piercingEffects[actor.attackStyle] });
      } else if(npcImage?.naturalWidth) {
        const size=Math.round(spriteSize);
        ctx.imageSmoothingEnabled=false;
        ctx.drawImage(npcImage,...npc.rect,-Math.round(npc.anchor[0]*size),-Math.round(npc.anchor[1]*size),size,size);
      } else if(hasAttackSprite) {
        window.AyothayaPreviewData.drawWildAttack(ctx,attackSprite,Math.round(spriteSize),actor.attackTell,
          actor.actionDuration-actor.actionTime,dx>0);
      } else if(cobra && (queen?cobraQueenSprite:cobraSprite).naturalWidth) {
        const bite=queen?(actor.attackStyle==='venom-pool'?'venom-pool':'queen-bite'):'cobra-strike';
        const motion=attack?bite:walking?'cobra-slither':'cobra-idle';
        const elapsed=attack?actor.actionDuration-actor.actionTime:time+(actor.origin?.x??0)*.013;
        const art=window.AyothayaPreviewData;
        art.drawCobra(ctx,queen?cobraQueenSprite:cobraSprite,0,0,Math.round(spriteSize*(queen?1.82:1)),
          motion,elapsed,dx>0,queen?art.queen:art.cobra);
      } else if(type==='dummy' && dummySprite.complete && dummySprite.naturalWidth) {
        const h=Math.round(heightOnScreen);
        const w=Math.round(h*dummySprite.naturalWidth/dummySprite.naturalHeight);
        ctx.imageSmoothingEnabled=false;
        ctx.drawImage(dummySprite,-Math.round(w/2),-h,w,h);
      } else if(type==='pret' && pretSprite.complete && pretSprite.naturalWidth) {
        const h=Math.round(heightOnScreen);
        const w=Math.round(h*pretSprite.naturalWidth/pretSprite.naturalHeight);
        if(dx<0) ctx.scale(-1,1);
        ctx.drawImage(pretSprite,-Math.round(w*.43),-h,w,h);
      } else if(crocodile) {
        drawChalawanSprite(spriteSize*2.19,dx<0);
      } else if(type==='guardian' && guardianSprite) {
        const {sprite,anchor}=guardianSprite;
        const w=Math.round(heightOnScreen*sprite.width/sprite.height);
        ctx.imageSmoothingEnabled=true;
        ctx.imageSmoothingQuality='high';
        ctx.drawImage(sprite,Math.round(-w*anchor[0]),Math.round(-heightOnScreen*anchor[1]),w,Math.round(heightOnScreen));
      } else if(atlasEntry&&atlas.complete&&atlas.naturalWidth>=384) {
        const [ax,ay]=atlasEntry;
        const f=spriteSize/96;
        const squash=(kind==='enemy'&&type==='tamarind')?1+Math.sin(time*5+actor.y)*.10:1;
        ctx.scale(1/squash,squash);
        if(walking&&kind!=='enemy'){
          ctx.drawImage(atlas,ax*96,ay*96,96,69,-spriteSize/2,-86*f, spriteSize,69*f);
          const step=Math.round(Math.sin(phase*.5)*2.8*scale);
          ctx.drawImage(atlas,ax*96,ay*96+69,48,27,-spriteSize/2+step*.42,-17*f+step*.35,spriteSize/2,27*f);
          ctx.drawImage(atlas,ax*96+48,ay*96+69,48,27,-step*.42,-17*f-step*.35,spriteSize/2,27*f);
        } else ctx.drawImage(atlas,ax*96,ay*96,96,96,-spriteSize/2,-86*f,spriteSize,spriteSize);
      } else {
        const key=`${type}_${dir}_${frame}`;
        if(!sprites.has(key)) sprites.set(key,actorSprite(type,dir,frame));
        const h=heightOnScreen*(kind==='enemy'?1.25:1);
        const w=h*32/43;
        ctx.drawImage(sprites.get(key),-w/2,-h,w,h);
      }
      ctx.restore();
      if(attack&&!slam&&!armedPlayer&&!crocodile&&!cobra&&!hasAttackSprite) drawSlash(sx,sy-heightOnScreen*.49,bearing,progress,unit,kind,actor.attackStyle);
      if(cast&&!dead&&kind!=='player'){
        ctx.strokeStyle='#c9eccb';
        ctx.lineWidth=1;
        ctx.beginPath();ctx.ellipse(sx,sy+1,22*scale,8*scale,0,0,TAU);ctx.stroke();
        const lift=(time*23)%20;
        for(let i=0;i<4;i++){
          ctx.fillStyle=i%2?'#f0de9f':'#a4d8c4';
          ctx.fillRect(sx+(i-1.5)*9*scale,sy-lift-i*2,2*scale,2*scale);
        }
      }
      if(dead) return;
      if(kind!=='player'){
        const nameY=sy-heightOnScreen-4*scale;
        const title=kind==='enemy'&&actor.level?`${actor.boss?'บอส ':''}${actor.name} · Lv.${actor.level}`:actor.name;
        const nearPlayer = Math.hypot(actor.x - state.player.x, actor.y - state.player.y) <= (aspect < 1.2 ? 152 : 205);
        if (kind !== 'enemy' || actor.boss || type === 'dummy' || state.targetId === actor.id || nearPlayer) {
          label(title,sx,nameY,actor.boss?'boss':kind,clamp(scale,.76,1.10));
        }
        if(kind==='npc'){
          const {harborQuest,trackedQuest:quest}=state;
          const challengeAvailable=actor.id===harborQuest.npcId&&harborQuest.status==='completed'&&harborQuest.loot==='unclaimed';
          const questAvailable=actor.id===quest?.npcId&&['available','ready'].includes(quest.status);
          if(questAvailable||challengeAvailable){
            const markerScale=clamp(scale,.85,1.8);
            const bob=reducedMotion.matches?0:Math.sin(time*3.5)*2*markerScale;
            drawQuestMarker(sx,nameY-16*markerScale+bob,markerScale,questAvailable&&quest.status==='ready');
          }
        }
        if(kind==='enemy'&&actor.hp<actor.maxHp&&actor.hp>0){
          ctx.fillStyle='#382c28';ctx.fillRect(sx-12*scale,sy+5*scale,24*scale,3*scale);
          ctx.fillStyle='#dfad65';ctx.fillRect(sx-11*scale,sy+6*scale,22*scale*actor.hp/actor.maxHp,Math.max(1,scale));
        }
      }
      if(kind==='enemy'||kind==='npc') hitAreas.push({kind,entity:actor,sx,sy,radius:Math.max(13,radius),height:heightOnScreen*1.22});
    }

    function drawQuestMarker(x,y,scale,ready) {
      ctx.save();
      ctx.font = '900 ' + Math.round(23 * scale) + 'px system-ui';
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.lineJoin = 'round';
      ctx.lineWidth = 3.5 * scale;
      ctx.strokeStyle = ready ? '#18351e' : '#513514';
      ctx.fillStyle = ready ? '#a5f17b' : '#ffdf60';
      ctx.strokeText('?',x,y);
      ctx.fillText('?',x,y);
      ctx.restore();
    }

    function drawSlash(x,y,bearing,progress,unit,kind,style) {
      if(progress<.27||progress>.72) return;
      const enemy=kind==='enemy';
      const fade=clamp((.72-progress)/.29,0,1);
      const radius=unit*(style==='sweep'?35:style==='heavy'?31:enemy?20:25);
      const arc=style==='sweep'?2.65:1.6;
      const tip=bearing+(progress-strikePhase)*6.4;
      const tail=tip-arc;
      const thickness=unit*(style==='heavy'?8:enemy?4:6);
      x+=Math.cos(bearing)*8*unit;
      y+=Math.sin(bearing)*6*unit;
      ctx.save();
      ctx.globalAlpha=fade;
      ctx.beginPath();
      ctx.arc(x,y,radius,tail,tip);
      ctx.arc(x,y,radius-thickness,tip,tail+.28,true);
      ctx.closePath();
      ctx.fillStyle=enemy?'#eda26e':style==='dash'?'#bce9ff':'#ffcf79';
      ctx.fill();
      ctx.lineWidth=Math.max(1,unit*1.6);
      ctx.strokeStyle=enemy?'#ffe5b9':'#fff3d0';
      ctx.beginPath();
      ctx.arc(x,y,radius-unit*.5,tail+.55,tip-.12);
      ctx.stroke();
      if(progress>=strikePhase&&progress<.64) {
        const age=(progress-strikePhase)/(.64-strikePhase);
        ctx.globalAlpha=1-age;
        ctx.fillStyle=enemy?'#ffc280':'#fff0bb';
        for(let i=0;i<5;i++){
          const angle=bearing+(i-2)*.25;
          const spread=radius+unit*(3+age*(8+i*3));
          const size=Math.max(1,Math.round(unit*(i===2?3:2)));
          ctx.fillRect(Math.round(x+Math.cos(angle)*spread),Math.round(y+Math.sin(angle)*spread),size,size);
        }
      }
      ctx.restore();
    }

    function playSkillEffect(event, start) {
      const skill = event.status === 'bleed' ? 'bleed' : event.guarded ? 'guard' : event.skill;
      const visual = skillEffects[skill];
      if (!visual) return;
      if (skill === 'guard' && guardEffect?.ready && event.type === 'skill') return;
      const piercingEffect = piercingEffects[skill];
      const piercingStrike = piercingEffect?.ready && event.type === 'skill-strike';
      if (piercingEffect?.ready && (event.type === 'damage' || (skill === 'dash' && piercingStrike && !event.contact))) return;
      const guardImpact = event.guarded && guardEffect?.ready && event.source;
      const healBloom = skill === 'heal' && healEffect?.ready && event.type === 'skill';
      const heavyStrike = skill === 'heavy' && heavyEffect?.ready && drawPlayerSprite;
      if (heavyStrike && (event.type !== 'skill-strike' || !event.contact)) return;
      const interruptReady = skill === 'interrupt' && interruptEffect?.ready;
      const interruptStrike = interruptReady && event.type === 'skill-strike';
      if (interruptReady && (event.type === 'damage' || (interruptStrike && !event.contact))) return;
      const sweepTrail = skill === 'sweep' && sweepEffect?.ready && event.type === 'skill-strike';
      const spriteImpact = heavyStrike || interruptStrike ||
        (skill === 'sweep' && sweepEffect?.ready && heavyEffect?.ready && event.type === 'damage');
      const charge = event.type === 'skill' && event.windup > 0;
      if (event.type === 'skill' && !charge && skill !== 'guard' && skill !== 'heal') return;
      const duration = sweepTrail ? window.AyothayaSweepEffect.duration
        : guardImpact ? window.AyothayaGuardEffect.impactDuration
        : healBloom ? window.AyothayaHealEffect.duration
        : piercingStrike ? piercing.duration
        : interruptStrike ? interrupt.impactDuration
        : spriteImpact ? window.AyothayaHeavyEffect.impactDuration
        : charge ? event.windup : event.type === 'damage' ? .30 : visual.duration;
      activeEffects.push({ ...event, skill, colors: visual.colors, charge, sweepTrail, spriteImpact, guardImpact, healBloom, piercingStrike, duration, start });
    }

    function effectRing(x, y, radius, angle, span, colors, unit) {
      ctx.beginPath();
      for (let index = 0; index <= 32; index++) {
        const theta = angle + span * index / 32;
        const [sx, sy] = project(x + radius * Math.cos(theta), y + radius * Math.sin(theta), 2);
        if (index === 0) ctx.moveTo(sx, sy);
        else ctx.lineTo(sx, sy);
      }
      ctx.strokeStyle = colors[2];
      ctx.lineWidth = Math.max(1, 6 * unit);
      ctx.stroke();
      ctx.strokeStyle = colors[0];
      ctx.lineWidth = Math.max(1, 3.4 * unit);
      ctx.stroke();
      ctx.strokeStyle = colors[1];
      ctx.lineWidth = Math.max(.8, 1.05 * unit);
      ctx.stroke();
    }

    function drawPretSlam(actor, foreground = false) {
      const { x, y, actionTime, slam } = actor;
      const unit = sceneMode ? scene.h / 510 : clamp(zoom, .6, 2.4);
      const elapsed = slam.windup + slam.recovery - actionTime;
      const projectSlam = (dx, dy, height = 0) => project(x + dx, y + dy, height);
      pretSlamEffect?.[foreground ? 'foreground' : 'ground'](ctx, projectSlam, unit, slam, elapsed, reducedMotion.matches);
    }

    function drawChalawanSweep(actor, foreground = false) {
      const {x,y,actionTime,slam}=actor;
      const elapsed=slam.windup+slam.recovery-actionTime;
      const projectSweep=(dx,dy)=>project(x+dx,y+dy);
      chalawanSweepEffect?.[foreground?'foreground':'ground'](ctx, projectSweep, slam, elapsed, reducedMotion.matches);
    }

    function drawVenomGround(point, elapsed) {
      const { radius } = window.AyothayaGame.cobraQueen.venom;
      const [x,y]=project(point.x,point.y);
      const [eastX,eastY]=project(point.x+radius,point.y);
      const [southX,southY]=project(point.x,point.y+radius);
      const rx=Math.hypot(eastX-x,eastY-y);
      const ry=Math.hypot(southX-x,southY-y);
      window.AyothayaPreviewData.drawVenomPool(ctx,venomPoolSprite,x,y,rx,ry,elapsed,reducedMotion.matches);
    }

    function glow(point, radius, color) {
      const [x, y] = point;
      const gradient = ctx.createRadialGradient(x, y, 0, x, y, radius);
      gradient.addColorStop(0, color + 'a0');
      gradient.addColorStop(.44, color + '40');
      gradient.addColorStop(1, color + '00');
      ctx.fillStyle = gradient;
      ctx.fillRect(x - radius, y - radius, radius * 2, radius * 2);
    }

    function pixelSpark(x, y, size, color) {
      const edge = Math.max(1, Math.round(size));
      ctx.fillStyle = color;
      ctx.fillRect(Math.round(x) - edge, Math.round(y), edge * 3, edge);
      ctx.fillRect(Math.round(x), Math.round(y) - edge, edge, edge * 3);
    }

    function shield(point, unit, colors, filled) {
      const [x, y] = point;
      const points = [[0,-23],[21,-14],[19,5],[10,19],[0,26],[-10,19],[-19,5],[-21,-14]];
      ctx.save();
      ctx.translate(x, y);
      ctx.scale(unit, unit);
      const ring = new Path2D();
      for (const [index, [px, py]] of points.entries()) {
        if (index === 0) ring.moveTo(px, py);
        else ring.lineTo(px, py);
      }
      ring.closePath();
      if (filled) {
        ctx.fillStyle = colors[0] + '36';
        ctx.fill(ring);
      }
      ctx.strokeStyle = colors[2];
      ctx.lineWidth = 4.5;
      ctx.stroke(ring);
      ctx.strokeStyle = colors[0];
      ctx.lineWidth = 2.5;
      ctx.stroke(ring);
      ctx.strokeStyle = colors[1];
      ctx.lineWidth = 1;
      ctx.stroke(ring);
      for (const index of [0, 2, 4, 6]) pixelSpark(...points[index], 1, colors[1]);
      ctx.restore();
    }

    function drawGuard(actor, time, unit) {
      if (guardEffect?.ready) {
        const [x, y] = project(actor.x, actor.y);
        const elapsed = window.AyothayaGame.guardDuration - actor.guardTime;
        guardEffect.drawShield(ctx, elapsed, x, y - 27 * unit, unit, actor.guardTime, reducedMotion.matches);
        return;
      }
      const colors = skillEffects.guard.colors;
      const pulse = reducedMotion.matches ? .62 : .59 + .11 * Math.sin(time * 4);
      ctx.save();
      ctx.globalAlpha = Math.min(1, actor.guardTime * 3) * pulse;
      effectRing(actor.x, actor.y, 28, -.12, TAU, colors, unit * .60);
      shield(project(actor.x, actor.y, 28), unit, colors, true);
      ctx.restore();
    }

    function crescent(point, bearing, unit, colors) {
      ctx.save();
      ctx.translate(...point);
      ctx.rotate(bearing);
      ctx.scale(unit, unit);
      ctx.beginPath();
      ctx.moveTo(3,-33);
      ctx.quadraticCurveTo(52,-34,63,-4);
      ctx.quadraticCurveTo(69,19,28,37);
      ctx.quadraticCurveTo(48,17,44,0);
      ctx.quadraticCurveTo(37,-22,3,-33);
      ctx.fillStyle = colors[0];
      ctx.fill();
      ctx.strokeStyle = colors[2];
      ctx.lineWidth = 2.1;
      ctx.stroke();
      ctx.beginPath();
      ctx.moveTo(16,-29);
      ctx.quadraticCurveTo(53,-26,57,-4);
      ctx.quadraticCurveTo(63,16,39,29);
      ctx.strokeStyle = colors[1];
      ctx.lineWidth = 3.6;
      ctx.stroke();
      ctx.restore();
    }

    function bladeStreak(from, to, thickness, colors) {
      const dx = to[0] - from[0], dy = to[1] - from[1];
      const length = Math.hypot(dx, dy);
      if (length < 1) return;
      ctx.save();
      ctx.translate(...from);
      ctx.rotate(Math.atan2(dy, dx));
      ctx.lineWidth = Math.max(.8, thickness * .14);
      poly(ctx, [[0,0],[length * .56,-thickness],[length,0],[length * .56,thickness]], colors[0], colors[2]);
      poly(ctx, [[length * .20,0],[length * .69,-thickness * .27],[length,0],
        [length * .69,thickness * .27]], colors[1]);
      ctx.restore();
    }

    function sparks(point, motion, reach, unit, colors, count, bearing = 0, span = TAU) {
      const [x, y] = point;
      for (let index = 0; index < count; index++) {
        const angle = bearing + span * ((index * .618 + .16) % 1 - .5);
        const radius = reach * (.38 + .62 * motion) * (.64 + (index % 4) * .14);
        const dx = Math.cos(angle) * radius;
        const dy = Math.sin(angle) * radius;
        const size = (index % 3 === 0 ? 2 : 1) * unit;
        pixelSpark(x + dx, y + dy, size, colors[index % 2]);
      }
    }

    function drawSkillCharge(effect, motion, unit, still) {
      const { x, y, colors } = effect;
      const center = project(x, y, 33);
      ctx.globalAlpha *= .62;
      glow(center, 25 * unit, colors[0]);
      sparks(center, 1 - motion, 27 * unit, unit, colors, still ? 3 : 6);
    }

    function drawSkillImpact(effect, motion, unit, still) {
      const { x, y, colors, guarded, critical } = effect;
      const point = project(x, y, guarded ? 29 : 19);
      glow(point, (19 + 21 * motion) * unit, colors[0]);
      if (guarded) shield(point, unit * (.70 + .28 * motion), colors, false);
      for (let index = 0; index < (still ? 3 : 7); index++) {
        const angle = index * 2.4;
        const extent = (12 + 30 * motion) * unit * (.63 + (index % 3) * .18);
        const dx = Math.cos(angle) * extent, dy = Math.sin(angle) * extent;
        bladeStreak([point[0] + dx * .42, point[1] + dy * .42],
          [point[0] + dx, point[1] + dy], (critical ? 3.2 : 2.1) * unit, colors);
      }
      sparks(point, motion, 49 * unit, unit, colors, still ? 3 : 8);
    }

    function drawSupportEffect(effect, player, motion, unit, still) {
      const { skill, colors } = effect;
      const { x, y } = player;
      const radius = 22 + 26 * ease(motion);
      effectRing(x, y, radius, 0, TAU, colors, unit);
      if (skill === 'guard') {
        for (let segment = 0; segment < 6; segment++) {
          const angle = segment * TAU / 6;
          effectRing(x, y, radius + 7, angle - .29, .58, colors, unit * .66);
        }
        shield(project(x, y, 29), unit * (1.1 + .2 * motion), colors, false);
        return;
      }
      glow(project(x, y, 30), 38 * unit, colors[0]);
      for (let index = 0; index < (still ? 4 : 9); index++) {
        const angle = index * 2.4 + 2.8 * motion;
        const offset = 15 + (index % 3) * 9;
        const point = project(x + Math.cos(angle) * offset, y + Math.sin(angle) * offset,
          13 + (index % 4) * 9 + 33 * motion);
        pixelSpark(...point, (index % 3 === 0 ? 2.5 : 1.5) * unit, colors[index % 2]);
      }
    }

    function drawSweep(effect, motion, unit, still) {
      const { origin: { x, y }, range, colors } = effect;
      const radius = range * (.52 + .48 * ease(motion));
      const turn = motion * Math.PI * 1.15;
      for (const offset of [0, Math.PI]) {
        effectRing(x, y, radius, turn + offset, Math.PI * .87, colors, unit * 1.25);
        effectRing(x, y, radius * .77, turn + offset - .33, Math.PI * .52, colors, unit * .55);
      }
      const count = still ? 6 : 14;
      for (let index = 0; index < count; index++) {
        const angle = index * TAU / count + turn;
        const point = project(x + Math.cos(angle) * radius, y + Math.sin(angle) * radius,
          5 + (index % 3) * 7 + motion * 12);
        pixelSpark(...point, (1 + index % 2) * unit, colors[index % 2]);
      }
    }

    function drawDirectedSkill(effect, motion, unit, still) {
      const { skill, colors, origin, arrival, contact, range, dir } = effect;
      const [dx, dy] = directions[dir] || directions.s;
      const directionScale = range / Math.hypot(dx, dy);
      const from = project(origin.x, origin.y, 23);
      const aim = contact ? project(contact.x, contact.y, 21)
        : project(origin.x + dx * directionScale, origin.y + dy * directionScale, 23);
      const facing = Math.hypot(aim[0] - from[0], aim[1] - from[1]) > 3 ? aim
        : project(origin.x + dx * 24, origin.y + dy * 24, 23);
      const bearing = Math.atan2(facing[1] - from[1], facing[0] - from[0]);
      const side = [-Math.sin(bearing), Math.cos(bearing)];
      const offset = (point, distance) => [point[0] + side[0] * distance * unit, point[1] + side[1] * distance * unit];
      if (skill === 'thrust') {
        const end = [aim[0] + Math.cos(bearing) * 8 * unit, aim[1] + Math.sin(bearing) * 8 * unit];
        bladeStreak(from, end, (11 - 5 * motion) * unit, colors);
        for (const wing of [-1, 1]) bladeStreak(offset(from, 8 * wing), offset(end, 3 * wing), unit * 2, colors);
        if (contact) sparks(aim, motion, 31 * unit, unit, colors, still ? 3 : 7, bearing, 1.9);
      } else if (skill === 'dash') {
        const end = project(arrival.x, arrival.y, 23);
        for (const wing of [-1, 1]) bladeStreak(offset(from, 11 * wing), offset(end, 6 * wing), unit * 3, colors);
        bladeStreak(from, end, (15 - 7 * motion) * unit, colors);
        glow(end, 31 * unit, colors[0]);
        crescent(end, bearing + .12, unit * .76, colors);
        sparks(end, motion, 36 * unit, unit, colors, still ? 4 : 9, bearing + Math.PI, 2.4);
      } else if (skill === 'interrupt') {
        const [x, y] = aim;
        const reach = (13 + 11 * ease(motion)) * unit;
        glow(aim, 33 * unit, colors[0]);
        bladeStreak([x - reach, y - reach], [x + reach, y + reach], 5 * unit, colors);
        bladeStreak([x + reach, y - reach], [x - reach, y + reach], 4 * unit, colors);
        sparks(aim, motion, 32 * unit, unit, colors, still ? 3 : 7);
      } else {
        const sweepPoint = [from[0] + Math.cos(bearing) * 7 * unit, from[1] + Math.sin(bearing) * 7 * unit];
        crescent(sweepPoint, bearing - .43 + motion * .82, unit * (1 + motion * .2), colors);
        sparks(contact ? aim : sweepPoint, motion, 42 * unit, unit, colors, still ? 4 : 8, bearing, 2.3);
      }
    }

    function drawSkillEffects(player, time, behind = false) {
      if (!activeEffects.length) return;
      const unit = sceneMode ? scene.h / 510 : clamp(zoom, .6, 2.4);
      const still = reducedMotion.matches;
      for (let index = activeEffects.length - 1; index >= 0; index--) {
        const effect = activeEffects[index];
        if (behind && !effect.sweepTrail && !effect.healBloom && !effect.piercingStrike) continue;
        if (!behind && effect.healBloom) continue;
        const elapsed = Math.max(0, time - effect.start);
        const age = elapsed / effect.duration;
        if (age >= 1) {
          activeEffects.splice(index, 1);
          continue;
        }
        if (effect.healBloom) {
          const [x, y] = project(player.x, player.y);
          healEffect.draw(ctx, elapsed, x, y, unit, still);
          continue;
        }
        if (effect.piercingStrike) {
          const { skill, origin, arrival, contact, range, dir } = effect;
          const sprite = piercingEffects[skill];
          const dash = skill === 'dash';
          const trailHeight = dash ? 23 : 15;
          const from = project(origin.x, origin.y, trailHeight);
          if (behind) {
            let end = dash ? arrival : contact;
            if (!end) {
              const [dx, dy] = directions[dir] || directions.s;
              const reach = range / Math.hypot(dx, dy);
              end = { x: origin.x + dx * reach, y: origin.y + dy * reach };
            }
            sprite.drawTrail(ctx, elapsed, from, project(end.x, end.y, trailHeight), unit, still);
          } else if (contact) {
            const aim = project(contact.x, contact.y, trailHeight);
            const bearing = Math.atan2(aim[1] - from[1], aim[0] - from[0]);
            const impact = dash ? project(contact.x, contact.y, 19) : aim;
            sprite.drawImpact(ctx, elapsed, impact, bearing, unit, still);
          }
          continue;
        }
        if (effect.sweepTrail) {
          const { origin: { x, y }, range } = effect;
          const [cx, cy] = project(x, y, 20);
          const [eastX, eastY] = project(x + range, y, 20);
          const [southX, southY] = project(x, y + range, 20);
          const radiusX = Math.hypot(eastX - cx, southX - cx);
          const radiusY = Math.min(Math.hypot(eastY - cy, southY - cy), radiusX * .62);
          sweepEffect.draw(ctx, still ? .10 : elapsed, cx, cy, radiusX, radiusY, behind);
          continue;
        }
        if (effect.spriteImpact) {
          const contact = effect.contact ?? effect;
          const [x, y] = project(contact.x, contact.y);
          const scale = effect.skill === 'sweep' ? .78 : 1;
          const isInterrupt = effect.skill === 'interrupt';
          const sprite = isInterrupt ? interruptEffect : heavyEffect;
          sprite.drawImpact(ctx, isInterrupt && still ? .08 : elapsed, x, y - 23 * unit, unit * scale);
          continue;
        }
        if (effect.guardImpact) {
          const [x, y] = project(effect.x, effect.y);
          const [sourceX, sourceY] = project(effect.source.x, effect.source.y);
          const angle = Math.atan2(sourceY - y, sourceX - x);
          guardEffect.drawImpact(ctx, still ? .08 : elapsed, x + Math.cos(angle) * 26 * unit,
            y + (Math.sin(angle) * 27 - 27) * unit, unit, sourceX < x);
          continue;
        }
        const motion = still ? .48 : age;
        ctx.save();
        ctx.globalAlpha = (still ? .72 : 1) * (effect.charge ? Math.sin(age * Math.PI) : (1 - age) ** .8);
        if (effect.charge) drawSkillCharge(effect, motion, unit, still);
        else if (effect.type === 'damage') drawSkillImpact(effect, motion, effect.skill === 'bleed' ? unit * .52 : unit, still);
        else if (effect.skill === 'guard' || effect.skill === 'heal') drawSupportEffect(effect, player, motion, unit, still);
        else if (effect.skill === 'sweep') drawSweep(effect, motion, unit, still);
        else drawDirectedSkill(effect, motion, unit, still);
        ctx.restore();
      }
    }

    function drawTree(object,sx,sy) {
      const isTree=object.type==='tree';
      const tree=(isTree?trees:shrubs)[object.index];
      const scalar=zoom*object.size*(isTree?1.03:1);
      const w=tree.width*scalar,h=tree.height*scalar;
      shadow(sx+3*zoom,sy,w*.33,Math.max(2,10*zoom*object.size),isTree?'rgba(31,45,26,.32)':'rgba(35,49,29,.27)');
      ctx.drawImage(tree,Math.round(sx-w/2),Math.round(sy-h),Math.round(w),Math.round(h));
    }

    function drawDestination(destination,time,player) {
      if(!destination||Math.hypot(destination.x-player.x,destination.y-player.y)<13) return;
      const [x,y]=project(destination.x,destination.y);
      const r=8+Math.sin(time*4)*1.4;
      ctx.save();
      ctx.beginPath();
      ctx.strokeStyle='rgba(242,226,177,.83)';
      ctx.lineWidth=1.35;
      ctx.ellipse(x,y,r,r*.49,0,0,TAU);
      ctx.stroke();
      poly(ctx,[[x,y-5],[x+3,y-2],[x,y+1],[x-3,y-2]],'#ebd59a');
      ctx.restore();
    }

    function embers(time,ruins){
      ctx.save();
      for(let i=0;i<18;i++){
        const x=380+(i*103.37)%1038+(Math.sin(i+time*.81))*17;
        const y=251+(i*47.73)%604+(Math.sin(i*.72+time*.65))*14;
        const phase=Math.sin(time*1.7+i*2.56);
        if(phase<.52) continue;
        const [sx,sy]=project(x,y,8+((i*15)%23));
        ctx.globalAlpha=phase*.62;
        ctx.fillStyle=ruins?'#ddcf85':'#fff0ad';
        ctx.fillRect(Math.round(sx),Math.round(sy),i%5===0?3:2,1+(i%3===0));
      }
      ctx.restore();
    }

    function draw(state,time){
      if(!state?.player) return;
      const newZone=state.zone!==zoneId;
      if(newZone){
        zoneId=state.zone;
        map=maps[zoneId]||maps.village;
      }
      approaches=state.zoneInfo.gateApproaches ?? [];
      size();
      sceneMode=map.image.complete&&map.image.naturalWidth>0;
      updateCamera(state.player,time,newZone);
      ctx.fillStyle='#263b2d';
      ctx.fillRect(0,0,width,height);
      const ruins=zoneId==='ruins';
      const training=zoneId==='training';
      let zone=null;
      if(sceneMode){ ctx.drawImage(map.image,Math.round(scene.x),Math.round(scene.y),Math.ceil(scene.w),Math.ceil(scene.h)); }
      else if (!training) {
        if(!zones.has(zoneId)) zones.set(zoneId,createZone(ruins));
        zone=zones.get(zoneId);
        stampedTerrain(zone.terrain);
      }
      if (!training) drawWater(time,ruins);
      const portals=state.portals||[];
      if(sceneMode) {
        for(const portal of portals) {
          const doorway=map.doorways[portal.id];
          if(!doorway) continue;
          const unlocked=portalIsOpen(portal,state);
          if(unlocked) drawGateVortex(doorway,time);
          else drawLockedGate(doorway);
          const {x,y}=doorwayOnScreen(doorway);
          drawGateGlow(x,y,time,unlocked);
        }
      }
      drawDestination(state.destination,time,state.player);
      const entries=[];
      const add=(entity,kind)=>{
        const [x,y]=project(entity.x,entity.y);
        if(x < -190 || y < -160 || x > width+190 || y > height+205) return;
        let depth=y;
        if(kind==='scenery'&&entity.w&&entity.h) depth=project(entity.x+entity.w/2,entity.y+entity.h/2)[1];
        entries.push({entity,kind,x,y,depth});
      };
      hitAreas=[];
      if(zone) for(const object of zone.objects) add(object,'scenery');
      for(const animal of state.wildlife) add(animal,'wildlife');
      const arriving=state.enemies?.find(enemy=>enemy.entrance);
      for(const mob of state.enemies||[]) if(mob.visible!==false && !mob.entrance) add(mob,'enemy');
      for(const npc of state.npcs||[]) add(npc,'npc');
      for(const entity of state.interactables||[]) add(entity,'interactable');
      for(const portal of portals) add(portal,'portal');
      for(const player of state.remotePlayers||[]) add(player,'remote');
      add(state.player,'player');
      entries.sort((a,b)=>a.depth-b.depth);
      const models=zone?createModels(ctx,project,camera.yaw):null;
      const slamming=entries.find(({entity})=>entity.action==='attack' && entity.attackStyle==='pret-slam')?.entity;
      const sweeping=entries.find(({entity})=>entity.action==='attack' && entity.attackStyle==='tail-sweep')?.entity;
      const preparing=entries.filter(({kind,entity})=>kind==='enemy' && entity.action==='attack' && entity.attackTell &&
        entity.actionDuration-entity.actionTime+1e-9<entity.attackTell.windup);
      const spitting=state.enemies?.find(enemy=>enemy.action==='attack' && enemy.attackStyle==='venom-pool' &&
        enemy.actionTime>enemy.slam.recovery);
      if(slamming) drawPretSlam(slamming);
      if(sweeping) drawChalawanSweep(sweeping);
      if(state.venomPool) drawVenomGround(state.venomPool,state.venomPool.elapsed);
      if(spitting) drawVenomGround(spitting.venomTarget,spitting.slam.recovery-spitting.actionTime);
      const art=window.AyothayaPreviewData;
      for(const {entity} of preparing){
        const { attackTell, actionDuration, actionTime }=entity;
        art.drawAttackBoundary(ctx,(dx,dy)=>project(entity.x+dx,entity.y+dy),attackTell.radius,
          (actionDuration-actionTime)/attackTell.windup,art.wildAttacks[attackTell.id]);
      }
      drawSkillEffects(state.player, time, true);
      for(const {entity,kind,x,y} of entries){
        if(kind==='wildlife' && entity.type==='rabbit'){
          if(rabbitSprite.naturalWidth){
            const scale=(sceneMode?scene.h/510:clamp(zoom,.6,2.4))*64/96;
            const phase=reducedMotion.matches?0:entity.phase;
            shadow(x,y,12*scale,3*scale);
            window.AyothayaPreviewData.drawRabbit(ctx,rabbitSprite,x,y,scale,phase,entity.facingRight);
          }
        } else if(kind==='interactable') drawHarborInteractable(entity,x,y,state,time);
        else if(kind!=='scenery') drawActor(entity,kind,x,y,state,time);
        else if(entity.type==='tree'||entity.type==='shrub') drawTree(entity,x,y);
        else models.place(entity,time);
      }
      if(arriving) drawChalawanEntrance(arriving);
      drawSkillEffects(state.player, time);
      if(slamming) drawPretSlam(slamming, true);
      if(sweeping) drawChalawanSweep(sweeping,true);
      if(spitting){
        const { venomTarget, slam }=spitting;
        const [x,y]=project(venomTarget.x,venomTarget.y);
        const [bossX,bossY]=project(spitting.x,spitting.y);
        const size=sceneMode?scene.h/510:clamp(zoom,.6,2.4);
        window.AyothayaPreviewData.drawVenomSpit(ctx,bossX+(x>=bossX?1:-1)*20*size,bossY-67*size,x,y,
          slam.windup+slam.recovery-spitting.actionTime);
        label('พ่นพิษ',x,y+13,'boss',clamp(zoom,.8,1.1));
      }
      if(slamming && slamming.actionTime>slamming.slam.recovery){
        const [x,y]=project(slamming.x,slamming.y+slamming.slam.radius*.78);
        label('ทุบพื้น',x,y,'boss',clamp(zoom,.8,1.1));
      }
      if(sweeping && sweeping.actionTime>sweeping.slam.recovery){
        const [x,y]=project(sweeping.x,sweeping.y+sweeping.slam.radius*.78);
        label('ฟาดหาง',x,y,'boss',clamp(zoom,.8,1.1));
      }
      for(const {entity} of preparing){
        const [x,y]=project(entity.x,entity.y+entity.attackTell.radius);
        label(art.wildAttacks[entity.attackTell.id].name,x,y+13,'enemy',clamp(zoom,.8,1.05));
      }
      embers(time,ruins);
      lastTime=time;
      lastState=state;
    }

    function hit(clientX,clientY){
      const r=canvas.getBoundingClientRect();
      const sx=(clientX-r.left)*width/r.width,sy=(clientY-r.top)*height/r.height;
      for(let i=hitAreas.length-1;i>=0;i--){
        const area=hitAreas[i];
        if(Math.abs(sx-area.sx)<=area.radius&&sy>=area.sy-area.height&&sy<=area.sy+(area.bottom??12)){
          return {x:area.entity.x,y:area.entity.y,kind:area.kind,entity:area.entity};
        }
      }
      const ground=unproject(sx,sy);
      const bounds=lastState?.zoneInfo?.bounds;
      return { x:bounds?clamp(ground.x,bounds.left,bounds.right):ground.x,
        y:bounds?clamp(ground.y,bounds.top,bounds.bottom):ground.y,kind:'ground',entity:null };
    }

    function screenPoint(x, y, lift = 0) {
      const bounds = canvas.getBoundingClientRect();
      const [sx, sy] = project(x, y);
      const unit = sceneMode ? scene.h / 510 : clamp(zoom, .6, 2.4);
      return { x: bounds.left + sx * bounds.width / width,
        y: bounds.top + (sy - lift * unit) * bounds.height / height };
    }

    function drawMinimap(mini,state=lastState){
      if(!mini||!state?.player) return;
      const c=mini.getContext('2d');
      const {width:w,height:h}=mini;
      const view=maps[state.zone]||maps.village;
      const gates=state.zoneInfo.gateApproaches ?? [];
      const imageMode=view.image.complete&&view.image.naturalWidth>0;
      c.imageSmoothingEnabled=true;
      if(imageMode) {
        c.drawImage(view.image,0,0,w,h);
      }
      else {
        if(!zones.has(state.zone)) zones.set(state.zone,createZone(state.zone==='ruins'));
        const zone=zones.get(state.zone);
        c.drawImage(zone.terrain,0,0,w,h);
        c.fillStyle='#bd9256';
        for(const o of zone.objects) if(['chedi','house','broken','temple'].includes(o.type)) c.fillRect(o.x*w/WORLD_W,o.y*h/WORLD_H,o.w*w/WORLD_W,o.h*h/WORLD_H);
      }
      c.fillStyle='rgba(23,36,23,.18)';
      c.fillRect(0,0,w,h);
      const marker=(entity,fill,radius)=>{
        const [u,v]=imageMode?normalized(entity.x,entity.y,view,gates):[entity.x/WORLD_W,entity.y/WORLD_H];
        c.beginPath();c.arc(u*w,v*h,radius,0,TAU);
        c.fillStyle=fill;c.fill();
        if(radius>2){c.lineWidth=1;c.strokeStyle='#25382d';c.stroke();}
      };
      for(const enemy of state.enemies||[]) {
        if(enemy.visible!==false&&enemy.hp>0) marker(enemy,enemy.boss?'#eb9cff':'#db9261',enemy.boss?3.2:1.35);
      }
      for(const npc of state.npcs||[]) marker(npc,'#efd163',2.1);
      for(const entity of state.interactables||[]) {
        const open=entity.type==='ferry' && state.harborQuest.status==='completed';
        marker(entity,open?'#b6e8be':'#f4cd79',2.5);
      }
      for(const portal of state.portals||[]) {
        marker(portal,portalIsOpen(portal,state)?'#b8ece3':'#e2ad68',2.3);
      }
      for(const other of state.remotePlayers||[]) marker(other,'#a7d9ec',2.1);
      marker(state.player,'#fff4c8',3.2);
    }

    function relativeAxis(x,y){
      if(sceneMode||zoneId==='village') return {x,y};
      const c=Math.cos(camera.yaw),s=Math.sin(camera.yaw);
      return {x:x*c-y*s,y:x*s+y*c};
    }

    return {
      draw,hit,screenPoint,drawMinimap,relativeAxis,playSkillEffect,
      clearSkillEffects(){activeEffects.length=0;},
      setRenderScale(scale){renderScale=scale;},
      zoomBy(factor){camera.zoom=clamp(camera.zoom*factor,1,1.83);},
      resetCamera(){camera.zoom=1;camera.yaw=BASE_YAW;}
    };
  }

  window.AyothayaWorld={create:createRenderer};
})();
