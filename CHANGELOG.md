# VoTT Changelog
# [2.2.3](https://github.com/12343954/VoTT/compare/v2.2.2...v2.2.3) (2024-04-08)
- feat: Side bar
    - Add a search box
    - Add a button for untagged images
    - Add serial number to list

# [2.2.2](https://github.com/12343954/VoTT/compare/v2.1.0...v2.2.2) (2024-04-07)
[GitHub Release](https://github.com/12343954/VoTT/releases/tag/v2.2.2)

- feat: Automatically annotate images via YOLOv3 auto-detect webapi (with [AlexeyAB](https://github.com/AlexeyAB/darknet)'s YOLOv3 `yolo_cpp_dll.dll` in 2019, the fastest YOLO on RTX20 series graphics cards)

    shortcut key⌨: Q

    - webapi : http://localhost:50505/api/YOLOv3/detect/${image_path} , only accept local image path

        ```
        nvidia-smi
        Driver Version: 456.71  CUDA Version: 11.1

        nvcc -V
        nvcc: NVIDIA (R) Cuda compiler driver
        Copyright (c) 2005-2019 NVIDIA Corporation
        Built on Wed_Oct_23_19:32:27_Pacific_Daylight_Time_2019
        Cuda compilation tools, release 10.2, V10.2.89

        cuDnn 10.2
        ```

    - json result:
        ```
        {
            eta: 28, // ms
            diff: 0, // means no coincident recognition（green toast）
                  n, // means duplicate detection (yellow toast),
            detect: [{
                id, // detection index
                x,y,w,h,
                obj_id, obj_name, prob, // max prob
                obj_IDs: [ // the same region, order by prob desc
                    {obj_id, obj_name, prob},
                    ...
                    ]
                },
                ...
            ]
        }
        ```
- feat: Highlight the region on mouse enter each row in yolo detection dialog
- fix: Remove the last toast immediately, and show the next toast with result smoothly, avoid occluding the main UI


<!-- cl-start -->

# [2.1.0](https://github.com/Microsoft/VoTT/compare/v2.0.0...v2.1.0) (04-29-2019)
[GitHub Release](https://github.com/Microsoft/VoTT/releases/tag/v2.1.0)

- fix: Updates backwards compat & fixes cntk export image bug (#789)
- fix: Updates export options for pascalVOC rename (#788)
- fix: change method for alloc string to buffer (#777)
- feat: Add CSV Exporter (#757)
- fix: Fix display of tag color picker (#782)
- feat: Active Learning Updates (#778)
- doc: updates to readme and changelog (#781)
- doc: Adds CODE_OF_CONDUCT.md (#779)
- doc: Add bug & feature templates (#780)
- fix: Refactored project tag/delete updates (#764)
- fix: Enables selection of azure region for custom vision export (#765)
- feat: CNTK Export Provider (#771)
- feat: Save partial project progress during project creation (#769)
- fix: Fixes ymax and rename Tensorflow nama everywhere (#763)

# [2.0.0](https://github.com/Microsoft/VoTT/compare/v2.0.0-preview.3...v2.0.0) (04-12-2019)
[GitHub Release](https://github.com/Microsoft/VoTT/releases/tag/v2.0.0)

- doc: update v1/master reference (#748)
- ci: update pipeline for v2 flipover to master (#747)
- feat: add ability to import v1 video project (#726)
- fix: Move findDOMNode outside of render method (#745)
- doc: updating readme (#733)
- fix: Adjusts z-index video player overlays (#740)
- fix: Updated keyboard manager to support meta (aka cmd) key (#743)
- fix: don't allow invalid path characters in project name (#741)
- fix: switch asset count to include video frames (#717)
- feat: Enforce asset tagging before switching assets (#730)
- feat: Auto-size video/image assets and position canvas (#734)
- fix: CORS warning message for Bing Image Search (#732)
- feat: Adds option to specify if images are included with JSON export (#728)
- fix: Simplifies asset load flow (#727)
- fix: Render Enhancments (#719)
- feat: Add toast messages when entities are created / deleted (#714)
- feat: New Tag Input Component (#710)
- feat: Add more export options to pascal voc exporter (#705)
- feat: exclude desktop functionality from browser target (#713)
- feature: tracking app metrics for web olny (#712)
- fix: Catch error while tfrecord image not loaded (#701)
- ci: clean up deprecated pipelines (#708)
- feat: Update asset status to use badges & resize sidebar (#709)
- ci: refactor plato report pipeline (#707)
- ci: refactor web deploy pipeline (#702)
- feat: Help menu displaying keyboard shortcuts (#689)
- fix: replace default react favicon with tags icon (#699)
- WIP: resizes thumbnails and sidebar (#691)
- ci: update pipelines to work for all branches with prefix dev (#700)

# [2.0.0-preview.3](https://github.com/Microsoft/VoTT/compare/v2.0.0-preview.2...v2.0.0-preview.3) (03-20-2019)
[GitHub Release](https://github.com/Microsoft/VoTT/releases/tag/v2.0.0-preview.3)

- ci: Clean up sonar cloud issues
- Remove height from root style (#694)
- fix: Don't call tag click with invalid hot key (#690)
- refactor: remove redux-invariant & redux-logging from production (#680)
- fix: Cleans up some of the flexbox styling overflow content heights (#683)
- Blurring tag input on click and change (#679)
- fix: metrics page throw error if project has no tags (#681)
- feat: Updated UX of project metrics to include charts (#678)
- fix: open file containing special characters in the name [AB#17533] (#671)
- fix: Re-apply tags in editor when project tags are updated (#673)
- fix: remove profile settings and active learning (#677)
- fix: misspelling in applicationActions.ts [AB#17157]
- fix: display spinner icon on metrics panel when loading (#669)
- fix: standardize default export option to "visited" (#667)
- fix: Display asset load error when an asset fails to load (#654)
- Fix saving asset metadata for all valid asset type (#668)
- ci: disable web vott deploy for PR (#670)
- feat: Enable copy rectangle functionality in editor (#651)
- ci: Merge v2 into dev (#666)
- feat: Added Custom TitleBar & Status Bar (#664)

# [v2.0.0-preview.2](https://github.com/Microsoft/VoTT/compare/v2.0.0-preview.1...v2.0.0-preview.2) (03-08-2019)
[GitHub Release](https://github.com/Microsoft/VoTT/releases/tag/v2.0.0-preview.2)

- Bug/17537/fix title (#660)
- Ignore error from react drag n drop (#648)
- ci: Azure DevOps pipeline definitions for VoTT Web CD (#658)
- ci: script to deploy VoTT to Azure (#656)
- fix: Resolves issue exporting all assets (#649)
- fix: save tagged video frames as "jpg" files (#641)
- fix: remove grey and white from tagColors (#645)
- Handle project with no tags while loading regions (#644)
- fix: remove "All assets" from export options dropdown (#646)
- feat: Clear Regions updates [AB#17269] (#647)
- fix: Don't allow invalid pasting (#640)
- fix: set default export format in project (#642)
- fix: Tagging new region only applies to one region (#635)
- feature: Enhanced error message for unknown errors (not in prod mode) (#639)
- feature: display project metrics (#638)
- fix: re-add exportProject to registerToolbar (#634)
- fix: Upgrade vott-react and add test cases for adding new tags (#637)
- ci: modify pipeline to also run off dev branch (#633)
- fix: Updated EditorTagsInput to work with vott-react (#630)
- fix: Wrap the delete call to protect against 404's (#632)
- feat: add ability to import v1 projects (#610)
- feat: add hotkeys for all editor toolbar items and simplify tag input hotkeys (remove ctrl+) (#617)
- fix: Fixes issue where user is unable to navigate to new project screen (#629)
- feat: Copy, Cut, Paste and Clear (#624)
- docs: adds list of shortcuts (hotkeys) to docs (#628)
- fix: replaces emtpy with empty throughout (#627)
- fix: Resolves typescript tsc compile issues for v3.1.6 (#625)
- fix: Move last visited tag settings to reducer to fix delete file assets bug [#AB17101] (#626)
- feat: Export video frames AB#16583 (#585)
- ci: make sure build fail if codecov token is missing (#621)
- fix: User can navigate between key frames using keyboard accelerators (#619)
- fix: Delete asset metadata files when project is deleted (#620)
- feat: Ability to retain the state of the last viewed asset on project open [#AB17139] (#615)
- feat: Locked tags for tagging regions (#600)
- ci: update release names and package details (#614)
- ci: add changelog and release scripts (#608)
- fix: Fixes issue where regions cannot be deleted (#612)
- docs: update contribution guidelines for changelog (#606)
- feat: Add Project version info (#609)
- fix: Correct bounding box values on region move (#604)
- fix:Add Connection button displays with correct style (#603)
- ci: update sonarcloud to ignore test files (#602)
- fix:Resolves issue where user is unable to create new project (#601)
- fix: Navigating to homepage should't close any open project (#596)
- feat: Add tag to project while importing TFRecords [AB#17001] (#586)
- fix: Disables KeyboardManager when focused on input elements (#595)
- fix: Corrects canvas sizing and region sizes (#592)
- refactor:Refactor canvas component to utilize internal state (#594)
- rebasing and squashing wabrez/integrat-vott-react (#591)
- Only hook video state change on non-preview assets AB#17076 (#575)
- Fixes previous/next buttons to navigate between assets (#576)
- add keyboard shorcut for navigating video frames (#588)
- Removed toolbar items that are not implemented (#589)
- fix sidebar so it's in sync with asset navigation (#584)
- Updating report CI scripts to be more robust. (#581)
- Refactor region tags to only be a string array (#587)
- Fix Asset detection from path (#578)
- Inital user docs for video player AB#17082 (#580)
- EditorPage does not have correct state when navigating directly via URL- AB#17079 (#577)
- Added CI script for updating complexity reports, pushing to blob (#574)
- Import region metadata from TFRecords (#566)
- Added context menu option in electron for all input fields AB#16922 (#570)
- Adding visited/tagged marks on video timeline AB #16772 (#556)
- Fixed issue where validation was not showing up for source/target connection in project settings (#571)
- TFRecords import refactoring (#553)
- Added data-tag-name attr to the tag element (#569)
- Added v2 complexity report scripts. (#550)
- Update canvastools and fix tests (#567)
- Fixed delete project bug AB#17024 (#568)
- [Fixes AB#16951] - support up/down & w/s key for navigating assets (#547)
- Update project when in-use connection changes AB#16921 (#564)
- Added localization for export JSON files AB#16387 (#554)
- Enhanced video support (#544)
- Add support for keyUp and keyPress events (#539)
- Small refactor of canvas and editor page (#538)
- enable sonarcloud pr scan (#530)
