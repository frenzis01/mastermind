// SPDX-License-Identifier: MIT
pragma solidity ^0.8.0;

import "hardhat/console.sol";

contract Mastermind {
    uint256 public constant MAX_COLORS = 10;
    uint256 public constant CODE_LENGTH = 6;
    uint256 public constant NUM_TURNS = 4;
    uint256 public constant NUM_GUESSES = 10;
    uint256 public constant K_EXTRA_POINTS = 10;
    uint256 public constant B_AFKBLOCKS = 10;
    uint256 public constant TIME_TO_DISPUTE = 20000;


    // Struct to store game information
    struct Game {
        address creator; // Address of the game creator
        address joiner; // Address of the player joining the game
        uint256 gameStake; // Amount of wei staked by each player
        uint256 gameId; // Unique identifier for the game
        uint256 numColors; // Number of colors available in the game
        uint256 codeLength; // Length of the secret code
        uint256 numTurns; // Maximum number of turns allowed in the game
        uint256 maxGuesses; // Maximum number of guesses allowed per turn
        uint256 extraPointsK; // Extra points awarded to the codemaker if the codebreaker fails to guess the code
        uint256 timeToDispute; // Time limit for disputing feedback
        uint256 currentTurn; // Current turn number
        bool guessed; // Flag indicating if the code has been guessed in the current turn
        uint256 startTime; // Timestamp when the turn (!) started
        uint256 endTime; // Timestamp when the turn (!) ended and the code has been revealed
        uint256 b; // Number of blocks after which a player is considered AFK
        bool gameStarted; // Flag indicating if the game has started
        bool gameEnded; // Flag indicating if the game has ended
        mapping(address => bool) players; // Mapping to track players in the game
        mapping(address => uint256) points; // Mapping to track points earned by each player
        mapping(address => bool) accusedFB; // Mapping to track if a player has been accused of providing false feedback
        mapping(address => uint256) accusedAFK; // Mapping to track if a player has been accused of being AFK and at which time
        /**
         * // TODO evaluate which one of the two following options is better for guesses and feedbacks
         */
        // mapping(uint256 => uint256[][]) guesses; // Array to store guesses made by players
        // mapping(uint256 => uint256[][]) feedbacks; // Array to store feedbacks made by players
        uint256[][][] guesses; // Array to store guesses made by players
        uint256[][][] feedbacks; // Array to store feedbacks made by players
        /**
         * 
         * // TODO evaluate if it's better to hold current breaker and maker instead of deriving them
         * from the number of guesses/feedbacks
         * 
         * This may be done by easily changing the behaviour of getCurrentBreaker and getCurrentMaker  
         * and by setting maker and breaker in startTurn()
         */

        // address maker;
        // address breaker;

        /**
         * 
         *  TODO Evaluate whether it is better to hold a reference to the player who has to move instead of deriving it from
         * the number of guesses and feedbacks
         */
        // address currentPlayer;

        bool creatorIsMakerSeed; // Flag indicating if the creator is the code maker in the seed phase
        bytes32 codeHash; // Hash of the code chosen by the code maker
        uint256[] codeSecret; // Code chosen by the code maker, published at the end of each turn
    }

    // Mapping to store game instances
    mapping(uint256 => Game) public games;
    GameInfo[] public activeGames;
    GameInfo[] public joinableGames;

    // Counter for total number of games
    uint256 public totalGames;

    // Events to log game actions
    event GameCreated(
        uint256 gameId,
        address creator,
        uint256 numColors,
        uint256 codeLength,
        uint256 numTurns,
        uint256 maxGuesses,
        uint256 gameStake
    );
    event GameJoined(uint256 gameId, address joiner, address creator);
    event Guess(uint256 gameId, uint256[] guess);
    event Feedback(
        uint256 gameId,
        uint256 numCorrectPositions,
        uint256 numCorrectColors
    );
    event GameEnded(
        uint256 gameId,
        address winner,
        uint256 winnerPoints,
        uint256 loserPoints
    );

    event Dispute(
        uint256 gameId,
        uint256[] guessIDs
    );

    event AFKAccusation(uint256 gameId, address accused);
    event ResolveDispute(uint256 gameId, address punished);
    event TurnStarted(uint256 gameId, address codeMaker);
    event TurnEnded(uint256 gameId, bool guessed);
    event Punishment(uint256 gameId, address punished, uint256 amount);
    event HashPublished(uint256 gameId, address codeMaker, bytes32 hash);
    event CodeSecretPublished(uint256 gameId, uint256[] codeSecret);

    // Modifier to check if the dispute time has not elapsed
    modifier validDisputeTime(uint256 _gameId) {
        require(
            games[_gameId].endTime != 0,
            "Cannot dispute, Turn has not finished yet"
        );

        require(
            games[_gameId].codeSecret.length != 0,
            "Cannot dispute, Code secret has not been published yet"
        );

        uint256 timeUpperBound = games[_gameId].endTime +
            games[_gameId].timeToDispute;
        require(block.timestamp < timeUpperBound, "Dispute time expired");
        _;
    }

    // Modifier to check if a game is valid, has started and has not ended, and that the sender is a player
    modifier checkGameValidity(uint256 _gameId) {
        // Ensure game ID is valid
        require(_gameId < totalGames, "Invalid game ID");
        Game storage game = games[_gameId];
        // Ensure game has started
        require(game.gameStarted, "Game has not started");
        // Ensure game has not ended
        require(!game.gameEnded, "Game has ended");
        // Ensure sender is a player in the game
        require(game.creator == msg.sender || game.joiner == msg.sender, "Not authorized player");
        _; // This indicates that the modifier ends here and from now on the normal function code will execute
    }

    modifier turnNotEnded(uint256 _gameId) {
        require(
            games[_gameId].codeHash != 0x0,
            "Code hash not been submitted yet"
        );
        require(games[_gameId].endTime == 0, "Turn has ended");
        _;
    }

    function getNGames() external view returns (uint256) {
        return totalGames;
    }

    function getAllActiveGames() external view returns (GameInfo[] memory) {
        return activeGames;
    }

    function getActiveGames(address player) external view returns (GameInfo[] memory) {

        uint256[] memory resultIndexes = new uint256[](activeGames.length);
        uint count = 0;
        for (uint256 i = 0; i < activeGames.length; i++) {
            if (activeGames[i].joiner == player || activeGames[i].creator == player) {
                resultIndexes[count] = i;
                count++;
            }
        }
        GameInfo[] memory result = new GameInfo[](count);
        for(uint256 i = 0; i < count; i++){
            result[i] = activeGames[resultIndexes[i]];
        }
        
        return result;
    }

    function getGuesses(uint256 _gameId) external view returns (uint256[][] memory) {
        Game storage game = games[_gameId];
        return game.guesses[game.currentTurn];
    }
    
    function getFeedback(uint256 _gameId) external view returns (uint256[][] memory) {
        Game storage game = games[_gameId];
        return game.feedbacks[game.currentTurn];
    }

    struct GameInfo {
        uint256 gameId;
        address creator;
        address joiner;
        uint256 gameStake;
    }

    function getJoinableGames(address joiner) external view returns (
        GameInfo[] memory gamesInfo
    ) {
        // GameInfo[] storage filteredGames = joinableGames;
        uint256[] memory resultIndexes = new uint256[](joinableGames.length);
        uint count = 0;
        for (uint256 i = 0; i < joinableGames.length; i++) {
            if (joinableGames[i].joiner == joiner || (joinableGames[i].joiner == address(0) && joiner != joinableGames[i].creator)) {
                resultIndexes[count] = i;
                count++;
            }
        }
        GameInfo[] memory result = new GameInfo[](count);
        for(uint256 i = 0; i < count; i++){
            result[i] = joinableGames[resultIndexes[i]];
        }
        
        return result;
    }

    // Function to get GameInfo from Game
    function getInfoFromGame(Game storage game) internal view returns (GameInfo memory) {
        return (GameInfo(
            game.gameId,
            game.creator,
            game.joiner,
            game.gameStake
        ));
    }

    function createGame() external payable returns (uint256) {
        return createGameWithJoiner(address(0));
    }
    // Function to create a new game
    /**
     * @dev Creates a new game instance with the specified game stake
     * @param _joiner The address of only one player which may join the game
     */
    function createGameWithJoiner(address _joiner) public payable returns (uint256) {
        // Ensure game stake is greater than 0
        require(msg.value > 0, "Game stake must be greater than 0");


        // Place this at the end? // TODO understand whether the game results available before the end of the function
        handleDanglingGames();

        // Create a new game instance
        Game storage newGame = games[totalGames];
        newGame.numTurns = NUM_TURNS;
        newGame.creator = msg.sender;
        newGame.numColors = MAX_COLORS;
        newGame.codeLength = CODE_LENGTH;
        newGame.maxGuesses = NUM_GUESSES;
        newGame.timeToDispute = TIME_TO_DISPUTE;
        newGame.gameStake = msg.value;
        newGame.gameId = totalGames;
        newGame.gameEnded = false;
        newGame.gameStarted = false;
        newGame.currentTurn = 0;
        newGame.guessed = false;
        newGame.extraPointsK = K_EXTRA_POINTS;
        newGame.b = B_AFKBLOCKS;
        newGame.creatorIsMakerSeed = randomBool();
        newGame.codeHash = 0x0;
        newGame.guesses = new uint256[][][](0);
        newGame.feedbacks = new uint256[][][](0);
        newGame.guesses.push(new uint256[][](0));       // First element should be empty, to avoid index-out-of-bounds
        newGame.feedbacks.push(new uint256[][](0));     // First element should be empty, to avoid index-out-of-bounds
        newGame.endTime = 1; // Set to 1 instead of 0 to allow the first turn to start
        newGame.codeSecret = new uint256[](1); // Set to 1 instead of 0 to allow the first turn to start
        newGame.joiner = _joiner;

        // Increment total number of games
        totalGames++;

        // Emit event to log game creation
        emit GameCreated(
            newGame.gameId,
            newGame.creator,
            newGame.numColors,
            newGame.codeLength,
            newGame.numTurns,
            newGame.maxGuesses,
            msg.value
        );

        joinableGames.push(getInfoFromGame(newGame));
        return newGame.gameId;
    }

    function submitCodeHash(
        uint256 _gameId,
        bytes32 _hash
    ) external checkGameValidity(_gameId) {
        Game storage game = games[_gameId];
        require(
            game.codeHash == 0x0,
            "Code hash has already been submitted"
        );
        address codeMaker = getCurrentMaker(_gameId);
        require(
            codeMaker == msg.sender,
            "Only the current CodeMaker can submit the code hash"
        );

        game.codeHash = _hash;

        emit HashPublished(_gameId, codeMaker, _hash);
    }

    // Function for a player to join a game
    function joinGame(uint256 _gameId) external payable {
        // Ensure game ID is valid
        require(_gameId < totalGames, "Invalid game ID");
        Game storage selectedGame = games[_gameId];
        // Ensure game has not started
        require(!selectedGame.gameStarted, "Game has already started");
        // Ensure correct game stake is sent
        require(
            msg.value == selectedGame.gameStake,
            "Incorrect game stake sent"
        );
        // Ensure creator cannot join their own game
        require(
            msg.sender != selectedGame.creator,
            "Creator cannot join their own game"
        );

        // If joiner address is empty, set it to the sender's address
        if (selectedGame.joiner == address(0)) {
            selectedGame.joiner = msg.sender;
        } else {
            // If joiner address is already set, only allow the creator to specify the joiner
            require(
                selectedGame.joiner == msg.sender, "Only a player specified by the creator may join the game"
            );
        }

        // If both players have joined, start the game
        selectedGame.gameStarted = true;
        // Timestamp is instead set when a turn starts
        // selectedGame.startTime = block.timestamp;

        // // These are inverted because they get swapped on startTurn
        // selectedGame.maker = selectedGame.creatorIsMakerSeed ? selectedGame.joiner : selectedGame.creator;
        // selectedGame.breaker = selectedGame.creatorIsMakerSeed ? selectedGame.creator : selectedGame.joiner;

        activeGames.push(getInfoFromGame(selectedGame));
        makeGameNotJoinable(_gameId);

        // Emit event to log game join
        emit GameJoined(_gameId, selectedGame.joiner, selectedGame.creator);
    }


    // one of the two users is chosen at random by the smart contract as
    // CodeMaker, and the other as CodeBreaker. Then, to guarantee that the secret chosen by the
    // CodeMaker at the beginning of each turn is not modified later, at each turn, the player
    // chosen as CodeMaker chooses the secret code and commits its hash on the blockchain.
    function startTurn(
        uint256 _gameId
    ) public checkGameValidity(_gameId) {
        Game storage game = games[_gameId];

        require(game.endTime != 0, "Cannot start new turn, current one has not finished yet");
        require(game.codeSecret.length != 0, "Cannot start new turn, previous code secret has not been published yet");
        require(msg.sender == getCurrentBreaker(_gameId) || msg.sender == address(this), "Only the previous breaker can start a new turn");
        // Increment current turn and mark the turn as started
        resetGuessState(_gameId);
        game.currentTurn++;
        game.startTime = block.timestamp;
        game.endTime = 0;
        game.codeSecret = new uint256[](0);
        game.codeHash = 0x0;
        game.guessed = false;


        game.accusedAFK[game.creator] = 0; // Reset the AFK accusation if present
        game.accusedAFK[game.joiner] = 0; // Reset the AFK accusation if present

        // address tmp = game.breaker;
        // game.breaker = game.maker;
        // game.maker = tmp;

        // Emit event to log turn start
        emit TurnStarted(_gameId, getCurrentMaker(_gameId));
    }

    function isBreakerTurn(uint256 _gameId) internal view returns (bool) {
        Game storage game = games[_gameId];
        return game.guesses[game.currentTurn].length == game.feedbacks[game.currentTurn].length;
    }

    function isMakerTurn(uint256 _gameId) internal view returns (bool) {
        return !isBreakerTurn(_gameId);
    }

    // Function for a player to make a guess
    function makeGuess(
        uint256 _gameId,
        // TODO memory indicates that the data is only stored for the duration of a function call, then discarded
        uint256[] memory guess
    ) external checkGameValidity(_gameId) turnNotEnded(_gameId) {
        // No need for require, checkGameValidity already has require and will revert if the game is invalid
        // require(checkGameValidity(_gameId), "Invalid game");
        Game storage game = games[_gameId];

        // Ensure guess length matches code length
        require(guess.length == game.codeLength, "Invalid guess length");
        
        // Ensure player has not already made a guess in the current turn
        require(
            isBreakerTurn(_gameId),
            "Code breaker has already made a guess"
        );
        game.guesses[game.currentTurn].push(guess);
        game.accusedAFK[msg.sender] = 0; // Reset the AFK accusation if present
        emit Guess(_gameId, guess); // Dummy event, replace with actual logic
    }

    function provideFeedback(
        uint256 _gameId,
        uint256 numCorrectPositions,
        uint256 numCorrectColors    // correct colors but in wrong positions!
    ) external checkGameValidity(_gameId) turnNotEnded(_gameId) {
        Game storage game = games[_gameId];
        // Ensure feedback is valid
        require(
                numCorrectColors + numCorrectPositions <= game.codeLength,
            "Invalid feedback"
        );
        // Ensure player has not already provided feedback in the current turn
        require(
            isMakerTurn(_gameId),
            "Code maker has already provided feedback");
        if (numCorrectPositions == game.codeLength) {
            endTurn(_gameId,true);
        }
        game.feedbacks[game.currentTurn].push([numCorrectPositions, numCorrectColors]);
        game.accusedAFK[msg.sender] = 0; // Reset the AFK accusation if present
        emit Feedback(_gameId, numCorrectPositions, numCorrectColors);
        if (game.guesses[game.currentTurn].length == game.maxGuesses) {
            endTurn(_gameId, false);
        }
    }

    // Internal function to end a turn in the game
    // `guessed` is not necessary... just more readable,
    // but it could be inferred from the game state (last feedback value)
    function endTurn(uint256 _gameId, bool guessed) internal checkGameValidity(_gameId) turnNotEnded(_gameId) {
        Game storage game = games[_gameId];
        game.endTime = block.timestamp;
        address maker = getCurrentMaker(_gameId);
        game.points[maker] += game.guesses[game.currentTurn].length;
        if (!guessed) {
            game.points[maker] += game.extraPointsK;
        }
        game.guessed = guessed;

        emit TurnEnded(_gameId, guessed);
        

        // Check if maximum turns have been reached
        // if (game.currentTurn >= game.numTurns) {
        //     // End the game if maximum turns reached
        //     endGame(
        //         _gameId,
        //         game.creator,
        //         game.joiner,
        //         game.points[game.creator],
        //         game.points[game.joiner]
        //     );
        // }
    }

    // Internal function to reset guess state at the end of each turn
    // This has to be called AFTER having disputed, if required.
    function resetGuessState(uint256 _gameId) internal {
        Game storage game = games[_gameId];
        game.guesses.push(new uint256[][](0)); 
        game.feedbacks.push(new uint256[][](0)); 
    }

    // Internal function to end the game and determine the winner
    function endGame(
        uint256 _gameId,
        address maker,
        address breaker,
        uint256 makerPoints,
        uint256 breakerPoints
    ) internal {
        makeGameInactive(_gameId);
        Game storage game = games[_gameId];
        // Mark the game as ended
        game.gameEnded = true;
        // Assign points to breaker and maker
        address winner = breakerPoints > makerPoints ? breaker : maker;
        address loser = breakerPoints > makerPoints ? maker : breaker;
        game.points[breaker] = breakerPoints;
        game.points[maker] = makerPoints;
        // Emit event to log game end
        emit GameEnded(
            _gameId,
            winner,
            game.points[winner],
            game.points[loser]
        );
        // Transfer game stake to winner
        payable(winner).transfer(game.gameStake);
    }

    // Function for a player to dispute feedback received from the opponent
    function disputeFeedback(
        uint256 _gameId,
        uint256[] memory guessIDs
    ) external checkGameValidity(_gameId) validDisputeTime(_gameId) {
        Game storage game = games[_gameId];
        // Ensure accuser is the codebreaker
        require(
            isCurrentBreaker(msg.sender, _gameId),
            "Only the codebreaker can dispute feedback"
        );

        // Only the maker may be accused of providing wrong feedback
        address accused = getCurrentMaker(_gameId);
        // Ensure player has not already disputed
        require(
            !game.accusedFB[accused],
            "Breaker has already disputed maker feedback"
        );

        require(
            guessIDs.length <= game.guesses[game.currentTurn].length,
            "Invalid number of guesses"
        );
        for (uint i = 0; i < guessIDs.length; i++) {
            // requires that ID[i] is not present in IDs[0..i-1]
            // i.e. guessIDs is a set
            require(
                guessIDs[i] < game.guesses[game.currentTurn].length,
                "Invalid guess ID"
            );
            for (uint j = 0; j < i; j++) {
                require(
                    guessIDs[i] != guessIDs[j],
                    "Duplicate guess ID. Guesses must be a set."
                );
            }
        }

        // Mark player as having disputed
        game.accusedFB[accused] = true;
        // Emit event to log dispute
        emit Dispute(_gameId, guessIDs);
        resolveDispute(_gameId, guessIDs);

    }

    function resolveDispute (uint256 _gameId, uint256[] memory guessIDs) internal checkGameValidity(_gameId) {
        Game storage game = games[_gameId];
        // Already performed by disputeFeedback
        // May assume that the parameter is always legal since the visibility is internal
        // require(
        //     guessIDs.length <= game.guesses[game.currentTurn].length,
        //     "Invalid number of guesses"
        // );
        
        // Redundant check, this is already performed in validDisputeTime(_gameId) 
        // require(game.codeSecret.length != 0, "Code secret has not been published yet");

        // NO NEED to check that the hash of the secret is equal to the hash submitted at the beginning of the turn
        // This is already done in the publishCodeSecret function
        // if (hashArrayOfIntegers(game.codeSecret) != game.codeHash){
        //     emit ResolveDispute(_gameId, maker);
        //     endGame(_gameId, maker, breaker, 0, 1);
        // }

        address breaker = getCurrentBreaker(_gameId);
        address maker = getCurrentMaker(_gameId);
        // Check that feedbacks are consistent
        for (uint i = 0; i < guessIDs.length; i++) {
            if (!isFeedbackValid(game.guesses[game.currentTurn][guessIDs[i]], game.feedbacks[game.currentTurn][guessIDs[i]], game.codeSecret)){
                emit ResolveDispute(_gameId, maker);
                endGame(_gameId, maker, breaker, 0, 1);
            }
        }
        // Punish the breaker who has unsuccessfully disputed the feedback
        emit ResolveDispute(_gameId, breaker);
        endGame(_gameId, maker, breaker, 1, 0);
    }

    function isFeedbackValid (uint256[] memory guess, uint256[] memory feedback, uint256[] memory codeSecret) internal pure returns (bool) {
        uint256 correctPositions = 0;
        uint256 correctColors = 0;
        uint256[] memory visitedIndexes = new uint256[](guess.length);
        for (uint i = 0; i < guess.length; i++) {
            if (guess[i] == codeSecret[i]) {
                correctPositions++;
                visitedIndexes[i] = 1;
            }
        }

        for (uint i = 0; i < guess.length; i++) {
            if (visitedIndexes[i] == 0) {
                for (uint j = 0; j < codeSecret.length; j++) {
                    if (guess[i] == codeSecret[j] && visitedIndexes[j] == 0) {
                        correctColors++;
                        visitedIndexes[j] = 1;
                        break;
                    }
                }
            }
        }

        return correctPositions == feedback[0] && correctColors == feedback[1];
    }

    // Function for a player to accuse the opponent of being AFK
    function accuseAFK(
        uint256 _gameId
    ) external checkGameValidity(_gameId) {
        Game storage game = games[_gameId];
        require(msg.sender == game.creator || msg.sender == game.joiner, "Only players in the game can accuse" );
        address accused = msg.sender == game.creator ? game.joiner : game.creator;

        // Ensure player has not already accused the opponent
        require(
            game.accusedAFK[accused] == 0,
            "Player has already accused opponent of being AFK"
        );

        // Ensure it's the turn of the accused
        require(
            (isBreakerTurn(_gameId) && accused == getCurrentBreaker(_gameId)) ||
            (isMakerTurn(_gameId) && accused == getCurrentMaker(_gameId)), 
            "It must be the turn of the accused");

        // Mark player as having disputed
        game.accusedAFK[accused] = block.number;
        // Emit event to log accusation
        emit AFKAccusation(_gameId, accused);
    }

    function verifyAFKAccusation(
        uint256 _gameId
    ) external checkGameValidity(_gameId) {
        Game storage game = games[_gameId];
        
        require(msg.sender == game.creator || msg.sender == game.joiner, "Only players in the game verify accuse" );
        address accused = msg.sender == game.creator ? game.joiner : game.creator;

        // Ensure player has been accused of being AFK
        require(
            game.accusedAFK[accused] != 0,
            "Player has not been accused of being AFK"
        );

        require(
            block.number > game.accusedAFK[accused] + game.b,
            "AFK accusation time has not expired"
        );

        // End the game and punish the accused if dispute is valid
        if (accused == game.creator) {
            endGame(_gameId, game.creator, game.joiner, 0, 1);
        } else {
            endGame(_gameId, game.creator, game.joiner, 1, 0);
        }
    }

    function publishCodeSecret(uint256 _gameId, uint256[] memory _codeSecret, bytes memory seed) external checkGameValidity(_gameId) {
        Game storage game = games[_gameId];
        require(game.startTime != 0 && game.endTime != 0, "Turn must be started and ended");
        address maker = getCurrentMaker(_gameId);
        require(msg.sender == maker, "Only the maker can publish the code secret");
        game.codeSecret = _codeSecret;
        emit CodeSecretPublished(_gameId, _codeSecret);
        
        address breaker = getCurrentBreaker(_gameId);
        // Check that the hash of the secret is equal to the hash submitted at the beginning of the turn
        // console.log("Before hashing");
        if (hashArrayOfIntegers(game.codeSecret, seed) != game.codeHash){
            emit ResolveDispute(_gameId, maker);
            endGame(_gameId, maker, breaker, 0, 1);
        }

        // Update the end time of the turn, so that the dispute time gets counted since the code secret gets published
        game.endTime = block.timestamp;

    }

    // Function to generate a pseudo-random boolean
    function randomBool() internal view returns (bool) {
        // Return true if the last bit of the random number is 1, otherwise false
        return randomInt() % 2 == 1;
    }

    function randomInt() internal view returns (uint256) {
        // Generate a pseudo-random number using block attributes
        uint256 randomNumber = uint256(
            keccak256(
                abi.encodePacked(
                    block.timestamp, // Current block timestamp
                    block.difficulty, // Current block difficulty
                    msg.sender // Address of the caller
                )
            )
        );
        return randomNumber;
    }

    function isCurrentMaker(
        address _player,
        uint256 _gameId
    ) internal view returns (bool) {
        Game storage game = games[_gameId];
        if (game.currentTurn == 0) {
            if (_player == game.creator) {
                return game.creatorIsMakerSeed;
            } else {
                return !game.creatorIsMakerSeed;
            }
        }  
        if (_player == game.creator) {
            if ((game.currentTurn % 2 == 1 && game.creatorIsMakerSeed) ||
                (game.currentTurn % 2 == 0 && !game.creatorIsMakerSeed)) {
                return true;
            }
        }
        if (_player == game.joiner) {
            if ((game.currentTurn % 2 == 0 && game.creatorIsMakerSeed) ||
                (game.currentTurn % 2 == 1 && !game.creatorIsMakerSeed)) {
                return true;
            }
        }
        return false;
    }

    function isCurrentBreaker(
        address _player,
        uint256 _gameId
    ) internal view returns (bool) {
        return !isCurrentMaker(_player, _gameId);
    }

    function getCurrentBreaker( uint256 _gameId) public view returns (address) {
        Game storage game = games[_gameId];
        if (isCurrentBreaker(game.creator, _gameId)) {
            return game.creator;
        }
        return game.joiner;
    }

    function getCurrentMaker(uint256 _gameId) public view returns (address) {
        Game storage game = games[_gameId];
        if (isCurrentMaker(game.creator, _gameId)) {
            return game.creator;
        }
        return game.joiner;
    }
    
    function hashArrayOfIntegers(uint256[] memory intArray, bytes memory seed) public pure returns (bytes32) {
        // Encode the array using abi.encodePacked
        bytes memory encodedArray = abi.encodePacked(intArray);

        // Combine the seed and the encoded array
        bytes memory combined = abi.encodePacked(seed, encodedArray);
        // Hash the encoded array using keccak256
        bytes32 h = keccak256(combined);
        return h;
    }

    event HandlingGame (uint256 gameId);
    function handleDanglingGames() internal {
        // Execute the lookup only 1/3 of the times
        // Disabled for testing
        // if (randomInt() % 100 < 60) {
        //     return;
        // }
        
        // Reverse lookup of games not yet ended
        for (uint256 index = activeGames.length ; index > 0; index--) {
            uint256 i = index -1;
            Game storage game = games[activeGames[i].gameId];
            // Check if the turn has ended
            if 
                (
                (game.gameStarted == true) &&
                (game.endTime != 0) &&
                // and the secret code has been revealed
                (game.codeSecret.length != 0) &&
                // and  if the time limit for disputing feedback has been reached 
                (block.timestamp > game.endTime + game.timeToDispute) &&
                (game.gameEnded == false)){
                    // Check if maximum turns have been reached
                    if (game.currentTurn >= game.numTurns || game.guessed) {
                        // Safe to end the game, breaker cannot dispute anymore
                        endGame(activeGames[i].gameId,game.creator,game.joiner,game.points[game.creator],game.points[game.joiner]);
                    }
                    else {
                        // Start a new turn
                        startTurn(activeGames[i].gameId);
                    }
                }
        }
    }
    function makeGameInactive(uint256 gameId) internal {
        // Check if the _gameId is an active game
        bool found = false;
        uint256 i = 0;
        for (i; i < activeGames.length; i++) {
            if (activeGames[i].gameId == gameId){
                found = true;
                break;
            }
        }

        if (found) {
            // Move the last element to the spot of the one to delete
            activeGames[i] = activeGames[activeGames.length-1];
        
            // Remove the last element
            activeGames.pop();
        }
    }

    function makeGameNotJoinable(uint256 gameId) internal {
        // Check if the _gameId is an active game
        bool found = false;
        uint256 i = 0;
        for (i; i < joinableGames.length; i++) {
            if (joinableGames[i].gameId == gameId){
                found = true;
                break;
            }
        }

        if (found) {
            // Move the last element to the spot of the one to delete
            joinableGames[i] = joinableGames[joinableGames.length-1];
        
            // Remove the last element
            joinableGames.pop();
        }
    }
    
    function getGameDetails(uint256 _gameId) public view returns (
        uint256 currentTime,
        address creator,
        address joiner,
        uint256 startTime,
        uint256 endTime,
        uint256 codeSecretLength,
        uint256 numTurns,
        uint256 numColors,
        uint256 codeLength,
        uint256 maxGuesses,
        uint256 timeToDispute,
        uint256 gameStake,
        uint256 gameId,
        bool gameEnded,
        bool gameStarted,
        uint256 currentTurn,
        uint256 extraPointsK,
        uint256 b,
        bool creatorIsMakerSeed,
        bytes32 codeHash,
        uint256 guessesLength,
        uint256 feedbacksLength,
        uint256[] memory codeSecret
    ) {
        Game storage game = games[_gameId];
        return (
            block.timestamp,
            game.creator,
            game.joiner,
            game.startTime,
            game.endTime,
            game.codeSecret.length,
            game.numTurns,
            game.numColors,
            game.codeLength,
            game.maxGuesses,
            game.timeToDispute,
            game.gameStake,
            game.gameId,
            game.gameEnded,
            game.gameStarted,
            game.currentTurn,
            game.extraPointsK,
            game.b,
            game.creatorIsMakerSeed,
            game.codeHash,
            game.guesses.length == 0 ? 0 : game.guesses[game.currentTurn].length,
            game.feedbacks.length == 0 ? 0 : game.feedbacks[game.currentTurn].length,
            game.codeSecret
        );
    }

    function bytes32ToString(bytes32 _bytes32) public pure returns (string memory) {
        uint8 i = 0;
        while(i < 32 && _bytes32[i] != 0) {
            i++;
        }
        bytes memory bytesArray = new bytes(i);
        for (i = 0; i < 32 && _bytes32[i] != 0; i++) {
            bytesArray[i] = _bytes32[i];
        }
        return string(bytesArray);
    }

    
    fallback() external {
        console.log("Fallback function called");
        revert();
    }
}

